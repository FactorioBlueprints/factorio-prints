import React, { useCallback, useId, useState } from "react";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import buildImageUrl, { ImageVariant } from "../helpers/buildImageUrl";
import type { UploadedImage } from "../helpers/uploadImage";

interface ImageUploadProps {
  // The image uploaded in this form so far, shown as a preview; null until one is uploaded.
  readonly image: UploadedImage | null;
  readonly onUploaded: (image: UploadedImage) => void;
  readonly upload: (file: File) => Promise<UploadedImage>;
}

const firstFile = (files: FileList | ArrayLike<File> | null | undefined): File | undefined =>
  files && files.length > 0 ? files[0] : undefined;

function ImageUpload({ image, onUploaded, upload }: ImageUploadProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (file: File | undefined) => {
      if (!file || uploading) return;
      setUploading(true);
      setError(null);
      try {
        onUploaded(await upload(file));
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, upload, uploading],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      void send(firstFile(event.dataTransfer?.files));
    },
    [send],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const file = firstFile(event.clipboardData?.files);
      if (file) {
        event.preventDefault();
        void send(file);
      }
    },
    [send],
  );

  return (
    <>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm="2">
          {"Screenshot"}
        </Form.Label>
        <Col sm={10}>
          <div
            data-testid="image-drop-zone"
            tabIndex={0}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onPaste={handlePaste}
            className="p-3 rounded"
            style={{ border: "2px dashed #6c757d" }}
          >
            <label htmlFor={inputId} className="btn btn-secondary me-2 mb-0">
              {"Choose an image"}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="d-none"
              disabled={uploading}
              onChange={(event) => {
                void send(firstFile(event.target.files));
                event.target.value = "";
              }}
            />
            <span className="text-muted">
              {uploading ? "Uploading…" : "or drop or paste a PNG, JPEG or GIF, up to 10 MB"}
            </span>
          </div>
          <div className="text-muted small mt-1">
            {"Save the blueprint within an hour of uploading, or the upload is removed."}
          </div>
          {error && <div className="text-danger mt-1">{error}</div>}
        </Col>
      </Form.Group>

      {image && (
        <Form.Group as={Row} className="mb-3">
          <Form.Label column sm="2">
            {"New screenshot"}
          </Form.Label>
          <Col sm={10}>
            <Card className="mb-2 mr-2" style={{ width: "14rem", backgroundColor: "#1c1e22" }}>
              <Card.Img
                variant="top"
                alt="New screenshot"
                src={buildImageUrl(image.id, image.type, ImageVariant.Thumbnail)}
              />
            </Card>
          </Col>
        </Form.Group>
      )}
    </>
  );
}

export default ImageUpload;
