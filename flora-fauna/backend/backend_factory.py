import importlib.util
import sys
from pathlib import Path


def load_create_app():
    package_dir = Path(__file__).resolve().parent / "app"
    init_file = package_dir / "__init__.py"

    spec = importlib.util.spec_from_file_location(
        "manara_backend_app",
        init_file,
        submodule_search_locations=[str(package_dir)],
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load backend app package from {init_file}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    create_app = getattr(module, "create_app", None)
    if create_app is None:
        raise ImportError("Backend app package does not export create_app")

    return create_app
