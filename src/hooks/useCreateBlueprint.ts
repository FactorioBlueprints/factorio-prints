import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "firebase/auth";
import { update as dbUpdate, push, ref, serverTimestamp } from "firebase/database";
import flatMap from "lodash/flatMap";
import { imageSourceUrl, type UploadedImage } from "../helpers/uploadImage";
import { getFirebaseDatabase } from "../utils/firebaseDatabase";
import {
  validateRawBlueprintSummary,
  validateRawPaginatedBlueprintSummaries,
  validateRawUserBlueprints,
  validateRawUserCollection,
} from "../schemas";

interface CreateBlueprintFormData {
  title: string;
  blueprintString: string;
  descriptionMarkdown: string;
  tags?: string[];
  image: UploadedImage;
}

interface CreateBlueprintMutationParams {
  formData: CreateBlueprintFormData;
  user: User;
}

interface CreateBlueprintResult {
  blueprintId: string;
  authorId: string;
}

export const useCreateBlueprint = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<CreateBlueprintResult, Error, CreateBlueprintMutationParams>({
    mutationFn: async ({ formData, user }) => {
      const image = { id: formData.image.id, type: formData.image.type };

      const blueprintData = {
        title: formData.title,
        blueprintString: formData.blueprintString,
        descriptionMarkdown: formData.descriptionMarkdown,
        tags: formData.tags || [],
        author: {
          userId: user.uid,
          displayName: user.displayName || null,
        },
        createdDate: serverTimestamp(),
        lastUpdatedDate: serverTimestamp(),
        favorites: {},
        numberOfFavorites: 0,
        image,
      };

      const blueprintSummary = {
        imgurId: image.id,
        imgurType: image.type,
        title: formData.title,
        numberOfFavorites: 0,
        lastUpdatedDate: serverTimestamp(),
      };

      const blueprintsRef = ref(getFirebaseDatabase(), "/blueprints");
      const newBlueprintRef = push(blueprintsRef, blueprintData);
      const newBlueprintKey = newBlueprintRef.key;

      if (!newBlueprintKey) {
        throw new Error("Failed to generate blueprint key");
      }

      const updates: Record<string, unknown> = {};

      updates[`/users/${user.uid}/blueprints/${newBlueprintKey}`] = true;
      updates[`/users/${user.uid}/collection/${newBlueprintKey}`] = true;
      updates[`/blueprintSummaries/${newBlueprintKey}`] = blueprintSummary;
      updates[`/blueprintsPrivate/${newBlueprintKey}/imageUrl`] = imageSourceUrl(image);

      (formData.tags || []).forEach((tag) => {
        updates[`/byTag/${tag}/${newBlueprintKey}`] = true;
      });

      await dbUpdate(ref(getFirebaseDatabase()), updates);

      return {
        blueprintId: newBlueprintKey,
        authorId: user.uid,
      };
    },
    onSuccess: ({ blueprintId, authorId }, { formData }) => {
      const now = new Date();
      const unixTimestamp = now.getTime();

      const imgurId = formData.image.id;
      const imgurType = formData.image.type;

      const lastUpdatedDateKey = ["blueprintSummaries", "orderByField", "lastUpdatedDate"];
      const lastUpdatedDateData = queryClient.getQueryData(lastUpdatedDateKey);

      if (
        lastUpdatedDateData &&
        typeof lastUpdatedDateData === "object" &&
        "pages" in lastUpdatedDateData &&
        Array.isArray(lastUpdatedDateData.pages)
      ) {
        try {
          const summaryData = {
            title: formData.title,
            imgurId: imgurId,
            imgurType,
            numberOfFavorites: 0,
            lastUpdatedDate: unixTimestamp,
          };

          const newSummary = validateRawBlueprintSummary(summaryData);
          const allBlueprints = flatMap(lastUpdatedDateData.pages, (page) =>
            page?.data
              ? Object.entries(page.data).map(([key, summary]) => ({
                  ...(summary as Record<string, unknown>),
                  key,
                }))
              : [],
          );

          type BlueprintWithKey = Record<string, unknown> & { key: string };
          const newSummaryWithKey = {
            ...newSummary,
            key: blueprintId,
          } as BlueprintWithKey;
          const updatedBlueprints = [
            newSummaryWithKey,
            ...allBlueprints.filter(
              (item): item is BlueprintWithKey =>
                typeof item === "object" &&
                item !== null &&
                "key" in item &&
                item.key !== blueprintId,
            ),
          ];

          const updatedPages = lastUpdatedDateData.pages.map((page, index) => {
            if (index === 0 && page?.data && Object.keys(page.data).length > 0) {
              const pageSize = Object.keys(page.data).length;
              const pageData = updatedBlueprints.slice(0, pageSize);
              const lastItem = pageData[pageData.length - 1];

              const pageDataRecord: Record<string, unknown> = {};
              for (const item of pageData) {
                const { key, ...summaryData } = item;
                pageDataRecord[key] = summaryData;
              }

              return {
                ...page,
                data: pageDataRecord,
                lastKey: lastItem?.key || page.lastKey,
                lastValue:
                  lastItem && "lastUpdatedDate" in lastItem
                    ? lastItem.lastUpdatedDate
                    : page.lastValue,
              };
            }
            return page;
          });

          const updatedPaginatedData = {
            ...lastUpdatedDateData,
            pages: updatedPages,
          };

          const validatedPaginatedData =
            validateRawPaginatedBlueprintSummaries(updatedPaginatedData);
          queryClient.setQueryData(lastUpdatedDateKey, validatedPaginatedData);
        } catch {}
      }

      const summaryKey = ["blueprintSummaries", "blueprintId", blueprintId];

      const summaryData = {
        title: formData.title,
        imgurId: imgurId,
        imgurType,
        numberOfFavorites: 0,
        lastUpdatedDate: unixTimestamp,
      };

      const blueprintSummary = validateRawBlueprintSummary(summaryData);
      queryClient.setQueryData(summaryKey, blueprintSummary);

      const userBlueprintsKey = ["users", "userId", authorId, "blueprints"];
      const userBlueprintsDataRaw = queryClient.getQueryData(userBlueprintsKey);
      const userBlueprintsData = userBlueprintsDataRaw
        ? validateRawUserBlueprints(userBlueprintsDataRaw)
        : {};

      queryClient.setQueryData(userBlueprintsKey, {
        ...userBlueprintsData,
        [blueprintId]: true,
      });

      const userCollectionKey = ["users", "userId", authorId, "collection"];
      const userCollectionDataRaw = queryClient.getQueryData(userCollectionKey);
      const userCollectionData = userCollectionDataRaw
        ? validateRawUserCollection(userCollectionDataRaw)
        : {};

      queryClient.setQueryData(userCollectionKey, {
        ...userCollectionData,
        [blueprintId]: true,
      });

      const availableTagsKey = ["tags"];
      const availableTags = queryClient.getQueryData(availableTagsKey) || [];

      if (Array.isArray(availableTags)) {
        availableTags.forEach((tag) => {
          const tagKey = ["byTag", tag];
          const tagDataRaw = queryClient.getQueryData(tagKey);

          if (tagDataRaw && typeof tagDataRaw === "object") {
            const tagData = validateRawUserBlueprints(tagDataRaw);
            const hasTag = (formData.tags || []).includes(tag);

            if (hasTag) {
              queryClient.setQueryData(tagKey, {
                ...tagData,
                [blueprintId]: true,
              });
            } else if (blueprintId in tagData) {
              const { [blueprintId]: _, ...rest } = tagData;
              queryClient.setQueryData(tagKey, rest);
            }
          }
        });
      }

      navigate({ to: "/user/$userId", params: { userId: authorId }, from: "/create" });
    },
  });
};
