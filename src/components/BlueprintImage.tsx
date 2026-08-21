import { faCog } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import Image from "react-bootstrap/Image";
import buildImageUrl, { ImageVariant } from "../helpers/buildImageUrl";

interface BlueprintImageProps {
  image?: {
    id: string;
    type: string;
  };
  thumbnail?: string | null;
  isLoading: boolean;
}

const BlueprintImage: React.FC<BlueprintImageProps> = ({ image, thumbnail, isLoading }) => {
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center">
        <FontAwesomeIcon icon={faCog} spin size="3x" className="my-4" />
      </div>
    );
  }

  if (!image || !thumbnail) {
    return null;
  }

  return (
    <a
      href={buildImageUrl(image.id, image.type, ImageVariant.Original)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image thumbnail className="border-warning" src={thumbnail} referrerPolicy="no-referrer" />
    </a>
  );
};

export default React.memo(BlueprintImage);
