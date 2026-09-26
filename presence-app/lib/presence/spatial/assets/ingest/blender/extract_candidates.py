"""Headless Blender extraction stage for the Presence spatial asset ingestion pipeline.

Run as:

    blender --background --factory-startup --python extract_candidates.py -- --job <job.json>

The job file describes one source asset. The script never writes to the source
folder: every output goes to the staging directory named in the job. It always
writes `blender-result.json` into that directory, including on failure, so the
TypeScript orchestrator can record a warning instead of losing the whole run.
"""

import json
import math
import os
import sys
import time
import traceback

import bpy
from mathutils import Vector

WRAPPER_NAME_HINTS = (
    "sketchfab_model",
    "rootnode",
    "root",
    "scene",
    "collection",
    "gltf_sceneroot",
)


def read_job():
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Expected `-- --job <path>` arguments.")
    args = argv[argv.index("--") + 1:]
    if len(args) < 2 or args[0] != "--job":
        raise RuntimeError("Expected `--job <path>`.")
    with open(args[1], "r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def triangle_count(obj):
    if obj.type != "MESH" or obj.data is None:
        return 0
    return sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def subtree(root):
    collected = []
    stack = [root]
    seen = set()
    while stack:
        node = stack.pop()
        if node.name in seen:
            continue
        seen.add(node.name)
        collected.append(node)
        stack.extend(node.children)
    return collected


def world_bounds(objects):
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    found = False
    for obj in objects:
        if obj.type != "MESH" or obj.data is None or len(obj.data.vertices) == 0:
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], point[axis])
                maximum[axis] = max(maximum[axis], point[axis])
            found = True
    if not found:
        return None
    return minimum, maximum


def bounds_payload(bounds):
    """Blender is Z-up; the pipeline records Y-up metres to match the glTF export."""
    if bounds is None:
        return None
    minimum, maximum = bounds
    return {
        "min": [round(minimum.x, 4), round(minimum.z, 4), round(-maximum.y, 4)],
        "max": [round(maximum.x, 4), round(maximum.z, 4), round(-minimum.y, 4)],
        "dimensions": {
            "width": round(maximum.x - minimum.x, 4),
            "height": round(maximum.z - minimum.z, 4),
            "depth": round(maximum.y - minimum.y, 4),
        },
        "center": [
            round((minimum.x + maximum.x) / 2, 4),
            round((minimum.z + maximum.z) / 2, 4),
            round(-(minimum.y + maximum.y) / 2, 4),
        ],
    }


def separation_roots():
    """Descends through pass-through wrapper nodes to reach the real objects.

    Sketchfab and FBX round-trips wrap whole scenes in one or more empties
    (`Sketchfab_model` -> `<file>.fbx` -> `RootNode` -> objects). Splitting on
    the literal scene roots would produce exactly one candidate per file, so the
    script keeps descending while the current level is a single mesh-less node.
    """
    roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
    descended = []
    while len(roots) == 1 and roots[0].type != "MESH" and len(roots[0].children) > 0:
        descended.append(roots[0].name)
        roots = list(roots[0].children)
    return roots, descended


def material_names(objects):
    names = []
    for obj in objects:
        for slot in getattr(obj, "material_slots", []):
            if slot.material is not None and slot.material.name not in names:
                names.append(slot.material.name)
    return names


def deselect_all():
    for obj in bpy.context.scene.objects:
        obj.select_set(False)


def select(objects, active=None):
    deselect_all()
    for obj in objects:
        if obj.name in bpy.context.view_layer.objects:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = active if active is not None else (objects[0] if objects else None)


def purge_orphans():
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for datablock in list(collection):
            if datablock.users == 0:
                try:
                    collection.remove(datablock)
                except Exception:
                    pass


def export_gltf(filepath, textured, image_quality, draco):
    """Exports the current selection.

    Shape-only is the default: materials keep their slot structure, names and
    base factors, but no image is written. Cameras, lights, animations, skins
    and morph targets are dropped for every candidate export.
    """
    kwargs = dict(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
        export_skins=False,
        export_morph=False,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="WEBP" if textured else "NONE",
    )
    if textured:
        kwargs["export_image_quality"] = image_quality
    if draco:
        kwargs["export_draco_mesh_compression_enable"] = True
        kwargs["export_draco_mesh_compression_level"] = 6
    bpy.ops.export_scene.gltf(**kwargs)


def resize_images(max_size):
    resized = []
    for image in bpy.data.images:
        width, height = image.size[0], image.size[1]
        if width <= 0 or height <= 0:
            continue
        longest = max(width, height)
        if longest <= max_size:
            continue
        factor = max_size / float(longest)
        try:
            image.scale(max(1, int(width * factor)), max(1, int(height * factor)))
            resized.append(image.name)
        except Exception:
            pass
    return resized


class ThumbnailRenderer:
    """Renders a framed preview of a selection. Failure is non-fatal by design."""

    def __init__(self, options):
        self.enabled = bool(options.get("thumbnails", True))
        self.size = int(options.get("thumbnailSize", 384))
        self.engine = options.get("thumbnailEngine", "BLENDER_WORKBENCH")
        self.samples = int(options.get("thumbnailSamples", 16))
        self.camera = None
        self.light = None
        self.failed = False

    def prepare(self):
        if not self.enabled or self.camera is not None:
            return
        scene = bpy.context.scene
        camera_data = bpy.data.cameras.new("presence_thumb_cam")
        camera_data.type = "ORTHO"
        self.camera = bpy.data.objects.new("presence_thumb_cam", camera_data)
        scene.collection.objects.link(self.camera)
        scene.camera = self.camera

        light_data = bpy.data.lights.new("presence_thumb_sun", type="SUN")
        light_data.energy = 3.0
        self.light = bpy.data.objects.new("presence_thumb_sun", light_data)
        scene.collection.objects.link(self.light)
        self.light.rotation_euler = (math.radians(55), 0.0, math.radians(35))

        scene.render.resolution_x = self.size
        scene.render.resolution_y = self.size
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        scene.render.image_settings.file_format = "WEBP"
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.image_settings.quality = 80
        try:
            scene.render.engine = self.engine
        except Exception:
            scene.render.engine = "CYCLES"
        if scene.render.engine == "CYCLES":
            scene.cycles.device = "CPU"
            scene.cycles.samples = self.samples
            scene.cycles.use_denoising = False
        else:
            scene.display.shading.light = "STUDIO"
            scene.display.shading.color_type = "MATERIAL"
            scene.display.shading.show_cavity = True

    def render(self, objects, filepath):
        if not self.enabled or self.failed:
            return None
        self.prepare()
        bounds = world_bounds(objects)
        if bounds is None:
            return None
        minimum, maximum = bounds
        center = (minimum + maximum) / 2.0
        extent = max((maximum - minimum).x, (maximum - minimum).y, (maximum - minimum).z, 0.001)

        direction = Vector((1.0, -1.2, 0.75)).normalized()
        self.camera.location = center + direction * (extent * 3.0)
        self.camera.data.ortho_scale = extent * 1.5
        self.camera.data.clip_start = 0.01
        self.camera.data.clip_end = max(1000.0, extent * 20.0)
        self.camera.rotation_euler = (center - self.camera.location).to_track_quat("-Z", "Y").to_euler()
        if self.light is not None:
            self.light.location = center + Vector((0.0, 0.0, extent * 2.0))

        visible = {obj.name for obj in objects}
        previous = {}
        for obj in bpy.context.scene.objects:
            previous[obj.name] = obj.hide_render
            obj.hide_render = obj.name not in visible and obj.type == "MESH"

        scene = bpy.context.scene
        scene.render.filepath = filepath
        try:
            bpy.ops.render.render(write_still=True)
        except Exception:
            self.failed = True
            return None
        finally:
            for obj in bpy.context.scene.objects:
                if obj.name in previous:
                    obj.hide_render = previous[obj.name]
        return filepath

    def cleanup(self):
        for obj in (self.camera, self.light):
            if obj is not None and obj.name in bpy.data.objects:
                bpy.data.objects.remove(obj, do_unlink=True)
        self.camera = None
        self.light = None


def duplicate_signature(entry):
    """Groups repeated instances of the same object so one candidate represents them all.

    Interior scenes repeat the same chair, rod or planter dozens of times. Without
    this the export cap fills with identical geometry and the candidate library
    duplicates the very meshes the component-reference model exists to share.
    """
    bounds = entry["bounds"]
    dimensions = (0.0, 0.0, 0.0)
    if bounds is not None:
        minimum, maximum = bounds
        dimensions = (
            round(maximum.x - minimum.x, 3),
            round(maximum.y - minimum.y, 3),
            round(maximum.z - minimum.z, 3),
        )
    return (
        entry["triangleCount"],
        len(entry["meshes"]),
        dimensions,
        tuple(sorted(material_names(entry["meshes"]))),
    )


def file_bytes(path):
    try:
        return os.path.getsize(path)
    except OSError:
        return None


def split_loose_parts(obj, max_parts):
    """Separates a single mesh object by loose parts. Returns the resulting objects."""
    select([obj], active=obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [candidate for candidate in bpy.context.selected_objects if candidate.type == "MESH"]
    parts.sort(key=lambda part: -triangle_count(part))
    return parts[:max_parts]


def duplicate_subtree(root):
    members = subtree(root)
    select(members, active=root)
    bpy.ops.object.duplicate(linked=False)
    duplicates = list(bpy.context.selected_objects)
    duplicate_names = {obj.name for obj in duplicates}
    duplicate_root = next((obj for obj in duplicates if obj.parent is None or obj.parent.name not in duplicate_names), None)
    if duplicate_root is not None and duplicate_root.parent is not None:
        select([duplicate_root], active=duplicate_root)
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    return duplicates, duplicate_root


def move_to_floor_centre_origin(duplicates, duplicate_root):
    """Applies the `floor-center` origin / `floor-contact` pivot convention."""
    bounds = world_bounds(duplicates)
    if bounds is None or duplicate_root is None:
        return bounds
    minimum, maximum = bounds
    offset = Vector(((minimum.x + maximum.x) / 2.0, (minimum.y + maximum.y) / 2.0, minimum.z))
    duplicate_root.location = duplicate_root.location - offset
    bpy.context.view_layer.update()
    return world_bounds(duplicates)


def delete_objects(objects):
    select([obj for obj in objects if obj.name in bpy.data.objects])
    if bpy.context.selected_objects:
        bpy.ops.object.delete()
    purge_orphans()


def run(job):
    options = job.get("options", {})
    staging_dir = job["stagingDir"]
    ensure_dir(staging_dir)

    warnings = []
    result = {
        "ok": True,
        "blenderVersion": bpy.app.version_string,
        "sourcePath": job["sourcePath"],
        "objects": [],
        "roomKit": None,
        "warnings": warnings,
        "descendedWrappers": [],
    }

    bpy.ops.wm.read_factory_settings(use_empty=True)
    started = time.time()
    bpy.ops.import_scene.gltf(filepath=job["sourcePath"])
    result["importSeconds"] = round(time.time() - started, 2)

    roots, descended = separation_roots()
    result["descendedWrappers"] = descended

    scene_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    result["sceneTriangleCount"] = sum(triangle_count(obj) for obj in scene_meshes)
    result["sceneBounds"] = bounds_payload(world_bounds(scene_meshes))
    result["sceneObjectCount"] = len(bpy.context.scene.objects)
    result["sceneMaterialNames"] = material_names(scene_meshes)[:64]

    renderer = ThumbnailRenderer(options)
    image_quality = int(options.get("imageQuality", 75))
    draco = bool(options.get("draco", True))
    result["geometryCompression"] = "draco" if draco else "none"

    # --- Room kit exports (whole scene) ---
    if job.get("exportRoomKit", False) and scene_meshes:
        room_kit = {"shapeOnly": None, "textured": None, "thumbnail": None, "resizedImages": []}
        select(scene_meshes)
        shape_path = os.path.join(staging_dir, "roomkit-shape.glb")
        try:
            export_gltf(shape_path, textured=False, image_quality=image_quality, draco=draco)
            room_kit["shapeOnly"] = {"file": os.path.basename(shape_path), "fileBytes": file_bytes(shape_path)}
        except Exception as error:
            warnings.append({"code": "blender-failed", "message": "Room-kit shape-only export failed: %s" % error})

        if job.get("exportTexturedRoomKit", False):
            room_kit["resizedImages"] = resize_images(int(options.get("maxTextureSize", 1024)))
            select(scene_meshes)
            textured_path = os.path.join(staging_dir, "roomkit-textured.glb")
            try:
                export_gltf(textured_path, textured=True, image_quality=image_quality, draco=draco)
                room_kit["textured"] = {"file": os.path.basename(textured_path), "fileBytes": file_bytes(textured_path)}
            except Exception as error:
                warnings.append({"code": "blender-failed", "message": "Room-kit textured export failed: %s" % error})

        thumb_path = os.path.join(staging_dir, "roomkit.webp")
        if renderer.render(scene_meshes, thumb_path):
            room_kit["thumbnail"] = os.path.basename(thumb_path)
        else:
            warnings.append({"code": "thumbnail-unavailable", "message": "Room-kit thumbnail could not be rendered."})
        result["roomKit"] = room_kit

    # --- Component candidate exports (one per separable object) ---
    min_triangles = int(options.get("minTriangles", 24))
    max_objects = int(options.get("maxObjects", 24))

    ranked = []
    for root in roots:
        members = subtree(root)
        meshes = [obj for obj in members if obj.type == "MESH"]
        if not meshes:
            continue
        ranked.append({
            "root": root,
            "members": members,
            "meshes": meshes,
            "triangleCount": sum(triangle_count(obj) for obj in meshes),
            "bounds": world_bounds(meshes),
        })
    ranked.sort(key=lambda entry: (-entry["triangleCount"], entry["root"].name))

    grouped = {}
    for entry in ranked:
        signature = duplicate_signature(entry)
        if signature in grouped:
            grouped[signature]["instanceNames"].append(entry["root"].name)
            continue
        entry["instanceNames"] = [entry["root"].name]
        grouped[signature] = entry
    unique = list(grouped.values())

    eligible = [entry for entry in unique if entry["triangleCount"] >= min_triangles]
    result["separableObjectCount"] = len(ranked)
    result["uniqueObjectCount"] = len(unique)
    result["eligibleObjectCount"] = len(eligible)
    if len(ranked) != len(unique):
        warnings.append({
            "code": "duplicates-collapsed",
            "message": "%d separable objects collapsed to %d unique shapes; repeated instances share one candidate." % (len(ranked), len(unique)),
        })
    if len(eligible) > max_objects:
        warnings.append({
            "code": "export-cap-reached",
            "message": "%d unique objects exceeded the export cap of %d; the remainder stay manifest-only." % (len(eligible), max_objects),
        })

    loose_parts_enabled = bool(options.get("looseParts", False))
    loose_part_max_triangles = int(options.get("loosePartMaxTriangles", 60000))
    loose_part_max_parts = int(options.get("loosePartMaxParts", 12))

    for index, entry in enumerate(eligible[:max_objects]):
        record = {
            "index": index,
            "name": entry["root"].name,
            "meshObjectCount": len(entry["meshes"]),
            "triangleCount": entry["triangleCount"],
            "materialNames": material_names(entry["meshes"]),
            "instanceCount": len(entry["instanceNames"]),
            "instanceNames": entry["instanceNames"][:12],
            "file": None,
            "fileBytes": None,
            "thumbnail": None,
            "bounds": None,
            "looseParts": [],
            "warnings": [],
        }
        duplicates = []
        try:
            duplicates, duplicate_root = duplicate_subtree(entry["root"])
            bounds = move_to_floor_centre_origin(duplicates, duplicate_root)
            record["bounds"] = bounds_payload(bounds)

            filename = "obj-%03d.glb" % index
            path = os.path.join(staging_dir, filename)
            select([obj for obj in duplicates if obj.type == "MESH"] or duplicates)
            export_gltf(path, textured=False, image_quality=image_quality, draco=draco)
            record["file"] = filename
            record["fileBytes"] = file_bytes(path)

            thumb_name = "obj-%03d.webp" % index
            if renderer.render([obj for obj in duplicates if obj.type == "MESH"], os.path.join(staging_dir, thumb_name)):
                record["thumbnail"] = thumb_name

            if loose_parts_enabled and len(entry["meshes"]) == 1 and entry["triangleCount"] <= loose_part_max_triangles:
                mesh_duplicates = [obj for obj in duplicates if obj.type == "MESH"]
                if len(mesh_duplicates) == 1:
                    parts = split_loose_parts(mesh_duplicates[0], loose_part_max_parts)
                    for part_index, part in enumerate(parts):
                        part_name = "obj-%03d-part-%02d.glb" % (index, part_index)
                        select([part])
                        export_gltf(os.path.join(staging_dir, part_name), textured=False, image_quality=image_quality, draco=draco)
                        record["looseParts"].append({
                            "index": part_index,
                            "name": part.name,
                            "file": part_name,
                            "fileBytes": file_bytes(os.path.join(staging_dir, part_name)),
                            "triangleCount": triangle_count(part),
                            "bounds": bounds_payload(world_bounds([part])),
                        })
                    duplicates = list({obj.name: obj for obj in (duplicates + parts)}.values())
        except Exception as error:
            record["warnings"].append({"code": "blender-failed", "message": "%s: %s" % (type(error).__name__, error)})
        finally:
            if duplicates:
                try:
                    delete_objects(duplicates)
                except Exception:
                    pass
        result["objects"].append(record)

    if renderer.failed:
        warnings.append({"code": "thumbnail-unavailable", "message": "Thumbnail rendering failed; candidates were exported without previews."})
    renderer.cleanup()
    return result


def main():
    job = None
    try:
        job = read_job()
        result = run(job)
    except Exception as error:
        result = {
            "ok": False,
            "blenderVersion": bpy.app.version_string,
            "error": "%s: %s" % (type(error).__name__, error),
            "traceback": traceback.format_exc(),
            "objects": [],
            "roomKit": None,
            "warnings": [{"code": "blender-failed", "message": str(error)}],
        }
    staging_dir = (job or {}).get("stagingDir")
    if staging_dir:
        ensure_dir(staging_dir)
        with open(os.path.join(staging_dir, "blender-result.json"), "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2)
    print("PRESENCE_BLENDER_RESULT %s" % json.dumps({"ok": result.get("ok", False)}))


main()
