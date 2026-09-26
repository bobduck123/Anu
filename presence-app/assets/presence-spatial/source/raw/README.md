# Raw source staging

This folder is an optional drop point for new `.glb` / `.gltf` source files.

It is **not** where the initial batch lives. The pipeline reads from whatever
folder is passed to `--source`, and the first ingestion read from
`C:\Dev\presence pieces`, which stays exactly where it is. Source files are
opened read-only: the pipeline never writes, renames, moves or deletes them.

To ingest files dropped here:

```bash
npm run ingest:spatial-assets -- --source assets/presence-spatial/source/raw
```

Model binaries in this folder are git-ignored. Keep the authoritative copies of
source assets, and their licence evidence, outside the repo.
