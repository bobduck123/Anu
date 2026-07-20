# Known Limitations

- **Storage privacy:** Production storage currently uses public-read Supabase object URLs. Draft inventory is hidden from public payloads, but uploaded bytes are not private if the UUID URL is discovered.
- **Upload architecture:** V1B is authenticated, backend-mediated multipart upload limited to 8 MB. It is not a direct signed-upload/confirm pipeline.
- **Media record:** Uploaded asset metadata is embedded within the existing nested draft inventory rather than a separate media asset table with processing/promotion state.
- **Roles:** Cover and current work-image targets are wired through the Media drawer; a comprehensive media-role manager is not complete.
- **Dimensions/processing:** Width and height extraction, EXIF/GPS stripping, optimisation, derivative generation, and duplicate detection are not implemented.
- **Crop:** Not implemented.
- **Focal point:** Not implemented because no proven render-model/public-render parity field exists.
- **Cleanup:** No automated deletion of an uploaded-but-unused stored object is implemented.
- **Hosted proof:** The V1A baseline has hosted manual smoke proof; V1B upload itself has not been deployed and re-smoked yet.
- **Release posture:** This is not ready for paid or public self-serve uploads while storage privacy and processing remain unresolved.
