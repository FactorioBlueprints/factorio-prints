import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { z } from "zod";
import {
  blueprintIdSchema,
  blueprintBookSchema,
  enrichedBlueprintSummarySchema,
  enrichedTagSchema,
  enrichedTagsSchema,
  rawBlueprintSchema,
  rawBlueprintSummaryPageSchema,
  rawBlueprintSummarySchema,
  rawPaginatedBlueprintSummariesSchema,
  rawTagsSchema,
  validate,
  validateEnrichedBlueprint,
  validateEnrichedBlueprintSummaries,
  validateEnrichedBlueprintSummary,
  validateEnrichedPaginatedBlueprintSummaries,
  validateEnrichedTags,
  validateEnrichedUser,
  validateEnrichedUserBlueprints,
  validateEnrichedUserCollection,
  validateEnrichedUserFavorites,
  validateRawBlueprintData,
  validateRawBlueprintSummaryPage,
  validateRawPaginatedBlueprintSummaries,
  validateRawTags,
  validateRawUser,
  validateRawUserBlueprints,
  validateRawUserCollection,
  validateRawUserFavorites,
} from "./schemas";

const sentryMocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
  captureMessage: sentryMocks.captureMessage,
}));

describe("Schema validation", () => {
  beforeEach(() => {
    sentryMocks.captureMessage.mockReset();
  });

  describe("blueprintIdSchema", () => {
    it("accepts a Firebase push ID", () => {
      expect(blueprintIdSchema.parse("00000000000000000000")).toBe("00000000000000000000");
    });

    it.each([
      "0000000000000000000",
      "000000000000000000000",
      "0000000000000000000.",
      "0000000000000000000#",
      "0000000000000000000$",
      "0000000000000000000[",
      "0000000000000000000]",
      "0000000000000000000/",
      "0000000000000000000\n",
    ])("rejects an invalid blueprint ID: %j", (blueprintId) => {
      expect(blueprintIdSchema.safeParse(blueprintId).success).toBe(false);
    });
  });

  describe("validate function", () => {
    it("validates data without reporting an event", () => {
      const mockSchema = { parse: vi.fn((data) => data) };
      const mockData = { test: "data" };

      const result = validate(mockData, mockSchema as any, "test data");

      expect({
        result,
        schemaParseCalls: mockSchema.parse.mock.calls,
        captureMessageCalls: sentryMocks.captureMessage.mock.calls,
      }).toStrictEqual({
        result: mockData,
        schemaParseCalls: [[mockData]],
        captureMessageCalls: [],
      });
    });

    it("reports one bounded event when schema parsing throws an unexpected error", () => {
      const validationError = new Error("Test validation failure");
      const mockSchema = {
        parse: vi.fn(() => {
          throw validationError;
        }),
      };
      const testData = { field: "test value" };

      expect(() => validate(testData, mockSchema as any, "test data")).toThrowError(
        new Error("Invalid test data: Test validation failure"),
      );
      expect({
        schemaParseCalls: mockSchema.parse.mock.calls,
        captureMessageCalls: sentryMocks.captureMessage.mock.calls,
      }).toStrictEqual({
        schemaParseCalls: [[testData]],
        captureMessageCalls: [
          [
            "Schema validation failed with unexpected error",
            {
              level: "error",
              fingerprint: ["schema-validation", "test data", "unexpected-error"],
              tags: { component: "schema-validation" },
              extra: {
                description: "test data",
                error: "Error: Test validation failure",
                payloadExcerpt: '{"field":"test value"}',
              },
            },
          ],
        ],
      });
    });

    it("reports FACTORIO-PRINTS-1JY, FACTORIO-PRINTS-1JZ, FACTORIO-PRINTS-1K0, and FACTORIO-PRINTS-1K1 as one bounded event", () => {
      const nestedBlueprintSchema = z.object({
        blueprint_book: z.object({
          blueprints: z.array(
            z.object({
              blueprint: z.object({
                entities: z.array(z.object({ name: z.string() })),
                label: z.string(),
              }),
            }),
          ),
        }),
      });
      const blueprintContext = {
        entities: [{ name: 100 }],
        label: "x".repeat(6_000),
      };
      const testData = {
        blueprint_book: {
          blueprints: [{ blueprint: blueprintContext }],
        },
      };
      const payload = JSON.stringify(testData);
      const serializedBlueprintContext = JSON.stringify(blueprintContext);

      expect(() =>
        validate(testData, nestedBlueprintSchema, "raw blueprint data", {
          blueprintId: "00000000000000000000",
        }),
      ).toThrowError(
        new Error(
          "Invalid raw blueprint data: blueprint_book.blueprints.0.blueprint.entities.0.name: Invalid input: expected string, received number",
        ),
      );

      expect(sentryMocks.captureMessage.mock.calls).toStrictEqual([
        [
          "Schema validation failed",
          {
            level: "error",
            fingerprint: ["schema-validation", "raw blueprint data"],
            tags: {
              component: "schema-validation",
              blueprintId: "00000000000000000000",
            },
            extra: {
              description: "raw blueprint data",
              errorCount: 1,
              reportedErrorCount: 1,
              errors: [
                {
                  path: "blueprint_book.blueprints.0.blueprint.entities.0.name",
                  message: "Invalid input: expected string, received number",
                  code: "invalid_type",
                  actualValue: "100",
                  actualType: "number",
                },
              ],
              dataType: "object",
              dataKeys: ["blueprint_book"],
              blueprintContexts: [
                {
                  path: "blueprint_book.blueprints.0.blueprint",
                  excerpt: `${serializedBlueprintContext.slice(0, 1_000)}... (truncated)`,
                },
              ],
              payloadExcerpt: `${payload.slice(0, 5_000)}... (truncated)`,
            },
          },
        ],
      ]);
    });
  });

  describe("raw schemas", () => {
    it("should validate a raw blueprint summary", () => {
      const fakeRawSummary = {
        title: "Test Blueprint",
        imgurId: "img123",
        imgurType: "image/png",
        numberOfFavorites: 5,
        lastUpdatedDate: 1625097600000,
        height: 200,
        width: 300,
      };

      expect(() => rawBlueprintSummarySchema.parse(fakeRawSummary)).not.toThrow();

      const invalidRawSummary = {
        ...fakeRawSummary,
        extraField: "should fail strict validation",
      };

      expect(() => rawBlueprintSummarySchema.parse(invalidRawSummary)).toThrow();
    });

    it("should validate a raw blueprint", () => {
      const fakeRawBlueprint = {
        title: "Test Blueprint",
        blueprintString: "base64string",
        createdDate: 1625097600000,
        descriptionMarkdown: "Description",
        lastUpdatedDate: 1625097600000,
        numberOfFavorites: 0,
        tags: ["tag1", "tag2"],
        author: {
          userId: "user123",
          displayName: "Test User",
        },
        image: {
          id: "img123",
          type: "image/png",
        },
        favorites: {},
      };

      expect(() => rawBlueprintSchema.parse(fakeRawBlueprint)).not.toThrow();

      const invalidRawBlueprint = {
        ...fakeRawBlueprint,
        unexpectedField: "should fail",
      };

      expect(() => rawBlueprintSchema.parse(invalidRawBlueprint)).toThrow();
    });

    it("should validate a raw blueprint with ISO string dates", () => {
      const fakeRawBlueprint = {
        title: "Test Blueprint",
        blueprintString: "base64string",
        createdDate: "2020-12-26T08:42:26.506Z",
        descriptionMarkdown: "Description",
        lastUpdatedDate: "2021-04-25T08:22:16.341Z",
        numberOfFavorites: 0,
        tags: ["tag1", "tag2"],
        author: {
          userId: "user123",
          displayName: "Test User",
        },
        image: {
          id: "img123",
          type: "image/png",
        },
        favorites: {},
      };

      const result = rawBlueprintSchema.parse(fakeRawBlueprint);
      expect(result.createdDate).toBe(1608972146506);
      expect(result.lastUpdatedDate).toBe(1619338936341);
    });

    it("should validate a raw blueprint summary page", () => {
      const fakeRawPage = {
        data: {
          key1: {
            title: "Test Blueprint 1",
            imgurId: "img123",
            imgurType: "image/png",
            numberOfFavorites: 5,
            lastUpdatedDate: 1625097600000,
            height: 200,
            width: 300,
          },
          key2: {
            title: "Test Blueprint 2",
            imgurId: "img456",
            imgurType: "image/jpeg",
            numberOfFavorites: 10,
            lastUpdatedDate: 1625097700000,
          },
        },
        lastKey: "key2",
        lastValue: 1625097700000,
        hasMore: true,
      };

      expect(() => rawBlueprintSummaryPageSchema.parse(fakeRawPage)).not.toThrow();

      const invalidRawPage = {
        ...fakeRawPage,
        unexpectedField: "should fail",
      };

      expect(() => rawBlueprintSummaryPageSchema.parse(invalidRawPage)).toThrow();
    });

    it("should validate raw paginated blueprint summaries", () => {
      const fakeRawPaginated = {
        pages: [
          {
            data: {
              key1: {
                title: "Test Blueprint 1",
                imgurId: "img123",
                imgurType: "image/png",
                numberOfFavorites: 5,
                lastUpdatedDate: 1625097600000,
              },
            },
            lastKey: "key1",
            lastValue: 1625097600000,
            hasMore: true,
          },
          {
            data: {
              key2: {
                title: "Test Blueprint 2",
                imgurId: "img456",
                imgurType: "image/jpeg",
                numberOfFavorites: 10,
                lastUpdatedDate: 1625097500000,
              },
            },
            lastKey: "key2",
            lastValue: 1625097500000,
            hasMore: false,
          },
        ],
        pageParams: [null, { key: "key1", value: 1625097600000 }],
      };

      expect(() => rawPaginatedBlueprintSummariesSchema.parse(fakeRawPaginated)).not.toThrow();

      const invalidPaginated = {
        pages: [
          {
            data: {},
            // Missing lastKey, lastValue, hasMore
          },
        ],
      };

      expect(() => rawPaginatedBlueprintSummariesSchema.parse(invalidPaginated)).toThrow();
    });
  });

  describe("validateEnrichedBlueprint", () => {
    it("should validate a valid enriched blueprint", () => {
      const mockBlueprint = {
        title: "Test Blueprint",
        blueprintString: "base64string",
        createdDate: 1625097600000,
        descriptionMarkdown: "Description",
        lastUpdatedDate: 1625097600000,
        numberOfFavorites: 0,
        tags: { tag1: true, tag2: true },
        author: {
          userId: "user123",
          displayName: "Test User",
        },
        image: {
          id: "img123",
          type: "image/png",
        },
        favorites: {},
        renderedDescription: "<p>Description</p>",
        key: "key123",
        thumbnail: "https://i.imgur.com/img123b.png",
        parsedData: null,
      };

      const result = validateEnrichedBlueprint(mockBlueprint);

      expect(result).toEqual(mockBlueprint);
    });
  });

  describe("validateEnrichedBlueprintSummary", () => {
    it("should validate a valid blueprint summary", () => {
      const mockSummary = {
        key: "key123",
        title: "Test Blueprint",
        imgurId: "img123",
        imgurType: "image/png",
        numberOfFavorites: 5,
        lastUpdatedDate: 1625097600000,
        height: 200,
        width: 300,
        thumbnail: "https://i.imgur.com/img123b.png",
      };

      const result = validateEnrichedBlueprintSummary(mockSummary);

      expect(result).toEqual(mockSummary);
    });

    it("should reject blueprint summary with unexpected fields", () => {
      const mockSummary = {
        key: "key123",
        title: "Test Blueprint",
        imgurId: "img123",
        imgurType: "image/png",
        numberOfFavorites: 5,
        lastUpdatedDate: 1625097600000,
        height: 200,
        width: 300,
        thumbnail: "https://i.imgur.com/img123b.png",
        extraField: "should fail",
      };

      expect(() => enrichedBlueprintSummarySchema.parse(mockSummary)).toThrow();
    });
  });

  describe("validateEnrichedBlueprintSummaries", () => {
    it("should validate an array of blueprint summaries", () => {
      const mockSummaries = [
        {
          key: "key1",
          title: "Blueprint 1",
          imgurId: "img1",
          imgurType: "image/png",
          numberOfFavorites: 5,
          lastUpdatedDate: 1625097600000,
          height: 200,
          width: 300,
          thumbnail: "https://i.imgur.com/img1b.png",
        },
        {
          key: "key2",
          title: "Blueprint 2",
          imgurId: "img2",
          imgurType: "image/png",
          numberOfFavorites: 10,
          lastUpdatedDate: 1625097700000,
          height: 400,
          width: 500,
          thumbnail: "https://i.imgur.com/img2b.png",
        },
      ];

      const result = validateEnrichedBlueprintSummaries(mockSummaries);

      expect(result).toEqual(mockSummaries);
    });
  });

  describe("validateEnrichedPaginatedBlueprintSummaries", () => {
    it("should validate paginated blueprint summaries", () => {
      const mockPaginatedData = {
        pages: [
          {
            data: [
              {
                key: "key1",
                title: "Blueprint 1",
                imgurId: "img1",
                imgurType: "image/png",
                numberOfFavorites: 5,
                lastUpdatedDate: 1625097600000,
                height: 200,
                width: 300,
                thumbnail: "https://i.imgur.com/img1b.png",
              },
            ],
            lastKey: "key1",
            lastValue: 1625097600000,
            hasMore: true,
          },
          {
            data: [
              {
                key: "key2",
                title: "Blueprint 2",
                imgurId: "img2",
                imgurType: "image/png",
                numberOfFavorites: 10,
                lastUpdatedDate: 1625097500000,
                thumbnail: "https://i.imgur.com/img2b.png",
              },
            ],
            lastKey: "key2",
            lastValue: 1625097500000,
            hasMore: false,
          },
        ],
        pageParams: [null, { key: "key1", value: 1625097600000 }],
      };

      const result = validateEnrichedPaginatedBlueprintSummaries(mockPaginatedData);

      expect(result).toEqual(mockPaginatedData);
    });
  });

  describe("validateRawBlueprintSummaryPage", () => {
    it("should validate a valid raw blueprint summary page", () => {
      const fakePage = {
        data: {
          key1: {
            title: "Test Blueprint",
            imgurId: "img123",
            imgurType: "image/png",
            numberOfFavorites: 5,
            lastUpdatedDate: 1625097600000,
          },
        },
        lastKey: "key1",
        lastValue: 1625097600000,
        hasMore: false,
      };

      const result = validateRawBlueprintSummaryPage(fakePage);
      expect(result).toEqual(fakePage);
    });

    it("should throw error for invalid page structure", () => {
      const invalidPage = {
        data: {
          key1: {
            title: "Missing required fields",
            // Missing imgurId, imgurType, numberOfFavorites
          },
        },
        lastKey: "key1",
        lastValue: 1625097600000,
        hasMore: false,
      };

      expect(() => validateRawBlueprintSummaryPage(invalidPage)).toThrow(
        "Invalid raw blueprint summary page",
      );
    });
  });

  describe("validateRawPaginatedBlueprintSummaries", () => {
    it("should validate valid raw paginated blueprint summaries", () => {
      const fakePaginatedData = {
        pages: [
          {
            data: {
              key1: {
                title: "Test Blueprint",
                imgurId: "img123",
                imgurType: "image/png",
                numberOfFavorites: 5,
                lastUpdatedDate: 1625097600000,
              },
            },
            lastKey: "key1",
            lastValue: 1625097600000,
            hasMore: false,
          },
        ],
        pageParams: [null],
      };

      const result = validateRawPaginatedBlueprintSummaries(fakePaginatedData);
      expect(result).toEqual(fakePaginatedData);
    });

    it("should validate paginated data without pageParams", () => {
      const fakePaginatedData = {
        pages: [
          {
            data: {},
            lastKey: null,
            lastValue: null,
            hasMore: false,
          },
        ],
      };

      const result = validateRawPaginatedBlueprintSummaries(fakePaginatedData);
      expect(result).toEqual(fakePaginatedData);
    });

    it("should throw error for missing pages array", () => {
      const invalidData = {
        // Missing pages array
        pageParams: [],
      };

      expect(() => validateRawPaginatedBlueprintSummaries(invalidData)).toThrow(
        "Invalid raw paginated blueprint summaries",
      );
    });

    describe("tag schemas", () => {
      describe("rawTagsSchema", () => {
        it("should validate valid raw tags data", () => {
          const validRawTags = {
            belt: ["balancer", "bus", "loader"],
            production: ["science", "smelting", "mining", "oil processing"],
            power: ["nuclear", "solar", "steam"],
            train: ["junction", "station", "stacker"],
            circuit: ["clock", "counter", "display"],
            mods: ["vanilla", "bobs", "angels"],
          };

          expect(() => rawTagsSchema.parse(validRawTags)).not.toThrow();
          const result = validateRawTags(validRawTags);
          expect(result).toEqual(validRawTags);
        });

        it("should validate empty raw tags", () => {
          const emptyTags = {};
          expect(() => rawTagsSchema.parse(emptyTags)).not.toThrow();
          const result = validateRawTags(emptyTags);
          expect(result).toEqual(emptyTags);
        });

        it("should validate single category with tags", () => {
          const singleCategory = {
            belt: ["balancer", "express transport belt (blue)"],
          };
          expect(() => rawTagsSchema.parse(singleCategory)).not.toThrow();
        });

        it("should reject non-string tag names", () => {
          const invalidTags = {
            belt: ["balancer", 123, "bus"], // Number in array
          };
          expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
        });

        it("should reject non-array values", () => {
          const invalidTags = {
            belt: "balancer", // String instead of array
          };
          expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
        });

        it("should reject nested objects", () => {
          const invalidTags = {
            belt: { balancer: true }, // Object instead of array
          };
          expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
        });

        it("should handle real-world tag data from tags.json", () => {
          const realWorldTags = {
            belt: [
              "balancer",
              "bus",
              "express transport belt (blue)",
              "fast transport belt (red)",
              "loader",
              "transport belt (yellow)",
            ],
            circuit: [
              "clock",
              "combinator",
              "counter",
              "display",
              "indicator",
              "memory cell",
              "power switch",
            ],
            general: [
              "beaconized",
              "book",
              "compact",
              "early game",
              "late game (megabase)",
              "mid game",
              "modular",
              "safe",
              "tileable",
              "tricks",
              "upgradeable",
            ],
            meta: ["copypasta", "tutorial"],
            mods: [
              "angels",
              "bobs",
              "creative",
              "expensive",
              "factorissimo",
              "lighted-electric-poles",
              "other",
              "vanilla",
              "warehousing",
            ],
            other: ["art", "defenses", "storage"],
            power: ["accumulator", "kovarex enrichment", "nuclear", "solar", "steam"],
            production: [
              "advanced circuit (red)",
              "batteries",
              "belts",
              "circuits",
              "coal liquification",
              "electronic circuit (green)",
              "fluids",
              "guns and ammo",
              "inserters",
              "mall (make everything)",
              "mining",
              "modules",
              "oil processing",
              "plastic",
              "processing unit (blue)",
              "research (labs)",
              "robots",
              "rocket parts",
              "science",
              "smelting",
              "uranium",
            ],
            train: [
              "crossing",
              "junction",
              "left-hand-drive",
              "loading station",
              "multi-station",
              "pax",
              "right-hand-drive",
              "roundabout",
              "stacker",
              "unloading station",
            ],
            version: ["0,14", "0,15"],
          };

          expect(() => rawTagsSchema.parse(realWorldTags)).not.toThrow();
          const result = validateRawTags(realWorldTags);
          expect(result).toEqual(realWorldTags);
        });
      });

      describe("enrichedTagSchema", () => {
        it("should validate valid enriched tag", () => {
          const validTag = {
            path: "/belt/balancer/",
            category: "belt",
            name: "balancer",
            label: "Balancer",
          };

          expect(() => enrichedTagSchema.parse(validTag)).not.toThrow();
        });

        it("should reject tag with missing fields", () => {
          const missingPath = {
            category: "belt",
            name: "balancer",
            label: "Balancer",
          };
          expect(() => enrichedTagSchema.parse(missingPath)).toThrow();

          const missingCategory = {
            path: "/belt/balancer/",
            name: "balancer",
            label: "Balancer",
          };
          expect(() => enrichedTagSchema.parse(missingCategory)).toThrow();

          const missingName = {
            path: "/belt/balancer/",
            category: "belt",
            label: "Balancer",
          };
          expect(() => enrichedTagSchema.parse(missingName)).toThrow();

          const missingLabel = {
            path: "/belt/balancer/",
            category: "belt",
            name: "balancer",
          };
          expect(() => enrichedTagSchema.parse(missingLabel)).toThrow();
        });

        it("should reject tag with extra fields due to strict mode", () => {
          const extraField = {
            path: "/belt/balancer/",
            category: "belt",
            name: "balancer",
            label: "Balancer",
            description: "This should fail",
          };
          expect(() => enrichedTagSchema.parse(extraField)).toThrow();
        });

        it("should reject non-string field values", () => {
          const invalidTypes = {
            path: 123, // Should be string
            category: "belt",
            name: "balancer",
            label: "Balancer",
          };
          expect(() => enrichedTagSchema.parse(invalidTypes)).toThrow();
        });

        it("should validate real-world tag examples", () => {
          const realWorldExamples = [
            {
              path: "/production/science/",
              category: "production",
              name: "science",
              label: "Science",
            },
            {
              path: "/belt/express transport belt (blue)/",
              category: "belt",
              name: "express transport belt (blue)",
              label: "Express Transport Belt (Blue)",
            },
            {
              path: "/train/left-hand-drive/",
              category: "train",
              name: "left-hand-drive",
              label: "Left-Hand-Drive",
            },
            {
              path: "/power/kovarex enrichment/",
              category: "power",
              name: "kovarex enrichment",
              label: "Kovarex Enrichment",
            },
          ];

          realWorldExamples.forEach((tag) => {
            expect(() => enrichedTagSchema.parse(tag)).not.toThrow();
          });
        });
      });

      describe("enrichedTagsSchema", () => {
        it("should validate array of enriched tags", () => {
          const validTags = [
            {
              path: "/belt/balancer/",
              category: "belt",
              name: "balancer",
              label: "Balancer",
            },
            {
              path: "/production/science/",
              category: "production",
              name: "science",
              label: "Science",
            },
            {
              path: "/train/junction/",
              category: "train",
              name: "junction",
              label: "Junction",
            },
          ];

          expect(() => enrichedTagsSchema.parse(validTags)).not.toThrow();
          const result = validateEnrichedTags(validTags);
          expect(result).toEqual(validTags);
        });

        it("should validate empty array", () => {
          const emptyArray: any[] = [];
          expect(() => enrichedTagsSchema.parse(emptyArray)).not.toThrow();
          const result = validateEnrichedTags(emptyArray);
          expect(result).toEqual(emptyArray);
        });

        it("should reject non-array values", () => {
          const notArray = {
            path: "/belt/balancer/",
            category: "belt",
            name: "balancer",
            label: "Balancer",
          };
          expect(() => enrichedTagsSchema.parse(notArray)).toThrow();
        });

        it("should reject array with invalid tag objects", () => {
          const invalidArray = [
            {
              path: "/belt/balancer/",
              category: "belt",
              name: "balancer",
              label: "Balancer",
            },
            {
              // Missing required fields
              path: "/production/science/",
            },
          ];
          expect(() => enrichedTagsSchema.parse(invalidArray)).toThrow();
        });

        it("should reject array with non-object elements", () => {
          const mixedArray = [
            {
              path: "/belt/balancer/",
              category: "belt",
              name: "balancer",
              label: "Balancer",
            },
            "string element", // Not an object
            123, // Not an object
          ];
          expect(() => enrichedTagsSchema.parse(mixedArray)).toThrow();
        });
      });

      describe("tag validation functions", () => {
        it("validateRawTags should provide clear error messages", () => {
          const invalidData = {
            belt: "not an array",
          };

          expect(() => validateRawTags(invalidData)).toThrow(/Invalid raw tags/);

          expect(sentryMocks.captureMessage.mock.calls).toStrictEqual([
            [
              "Schema validation failed",
              {
                level: "error",
                fingerprint: ["schema-validation", "raw tags"],
                tags: { component: "schema-validation" },
                extra: {
                  description: "raw tags",
                  errorCount: 1,
                  reportedErrorCount: 1,
                  errors: [
                    {
                      path: "belt",
                      message: "Invalid input: expected array, received string",
                      code: "invalid_type",
                      actualValue: '"not an array"',
                      actualType: "string",
                    },
                  ],
                  dataType: "object",
                  dataKeys: ["belt"],
                  blueprintContexts: [],
                  payloadExcerpt: '{"belt":"not an array"}',
                },
              },
            ],
          ]);
        });

        it("validateEnrichedTags should provide clear error messages", () => {
          const invalidData = [
            {
              path: "/belt/balancer/",
              // Missing other required fields
            },
          ];

          expect(() => validateEnrichedTags(invalidData)).toThrow(/Invalid enriched tags/);

          expect(sentryMocks.captureMessage.mock.calls).toStrictEqual([
            [
              "Schema validation failed",
              {
                level: "error",
                fingerprint: ["schema-validation", "enriched tags"],
                tags: { component: "schema-validation" },
                extra: {
                  description: "enriched tags",
                  errorCount: 3,
                  reportedErrorCount: 3,
                  errors: [
                    {
                      path: "0.category",
                      message: "Invalid input: expected string, received undefined",
                      code: "invalid_type",
                      actualValue: "undefined",
                      actualType: "undefined",
                    },
                    {
                      path: "0.name",
                      message: "Invalid input: expected string, received undefined",
                      code: "invalid_type",
                      actualValue: "undefined",
                      actualType: "undefined",
                    },
                    {
                      path: "0.label",
                      message: "Invalid input: expected string, received undefined",
                      code: "invalid_type",
                      actualValue: "undefined",
                      actualType: "undefined",
                    },
                  ],
                  dataType: "object",
                  dataKeys: ["0"],
                  blueprintContexts: [],
                  payloadExcerpt: '[{"path":"/belt/balancer/"}]',
                },
              },
            ],
          ]);
        });

        it("should handle null and undefined inputs", () => {
          expect(() => validateRawTags(null as any)).toThrow();
          expect(() => validateRawTags(undefined as any)).toThrow();
          expect(() => validateEnrichedTags(null as any)).toThrow();
          expect(() => validateEnrichedTags(undefined as any)).toThrow();
        });

        it("should validate complex nested structures", () => {
          const complexRawTags = {
            "very-long-category-name-that-should-still-work": [
              "tag with spaces",
              "tag-with-dashes",
              "tag_with_underscores",
              "tag (with parentheses)",
              "tag/with/slashes",
            ],
          };

          expect(() => validateRawTags(complexRawTags)).not.toThrow();
        });
      });
    });

    describe("user schemas", () => {
      describe("rawUserSchema", () => {
        it("should validate valid raw user data", () => {
          const validUser = {
            id: "user123",
            displayName: "John Doe",
            email: "john@example.com",
            favorites: {
              blueprint1: true,
              blueprint2: false,
            },
            blueprints: {
              blueprint3: true,
              blueprint4: true,
            },
          };

          expect(() => validateRawUser(validUser)).not.toThrow();
        });

        it("should validate user with minimal data", () => {
          const minimalUser = {
            id: "user123",
          };

          expect(() => validateRawUser(minimalUser)).not.toThrow();
        });

        it("should apply defaults for optional fields", () => {
          const userWithoutOptionals = {
            id: "user123",
          };

          const result = validateRawUser(userWithoutOptionals);
          expect(result.favorites).toEqual({});
          expect(result.collection).toEqual({});
          expect(result.blueprints).toEqual({});
        });

        it("should reject user without id", () => {
          const userWithoutId = {
            displayName: "John Doe",
          };

          expect(() => validateRawUser(userWithoutId)).toThrow();
        });

        it("should reject user with extra fields", () => {
          const userWithExtra = {
            id: "user123",
            extraField: "should not be allowed",
          };

          expect(() => validateRawUser(userWithExtra)).toThrow();
        });
      });

      describe("enrichedUserSchema", () => {
        it("should validate valid enriched user data", () => {
          const validEnrichedUser = {
            id: "user123",
            displayName: "John Doe",
            email: "john@example.com",
            favorites: {
              blueprint1: true,
              blueprint2: false,
            },
            blueprints: {
              blueprint3: true,
              blueprint4: true,
            },
            favoritesCount: 1,
            blueprintsCount: 2,
          };

          expect(() => validateEnrichedUser(validEnrichedUser)).not.toThrow();
        });

        it("should require count fields", () => {
          const userWithoutCounts = {
            id: "user123",
          };

          expect(() => validateEnrichedUser(userWithoutCounts)).toThrow();
        });

        it("should reject enriched user with extra fields", () => {
          const userWithExtra = {
            id: "user123",
            favoritesCount: 0,
            blueprintsCount: 0,
            extraField: "should not be allowed",
          };

          expect(() => validateEnrichedUser(userWithExtra)).toThrow();
        });
      });

      describe("user validation functions", () => {
        it("should handle null and undefined inputs", () => {
          expect(() => validateRawUser(null as any)).toThrow();
          expect(() => validateRawUser(undefined as any)).toThrow();
          expect(() => validateEnrichedUser(null as any)).toThrow();
          expect(() => validateEnrichedUser(undefined as any)).toThrow();
        });

        it("should validate user with empty favorites and blueprints", () => {
          const userWithEmptyRecords = {
            id: "user123",
            favorites: {},
            blueprints: {},
            favoritesCount: 0,
            blueprintsCount: 0,
          };

          expect(() => validateEnrichedUser(userWithEmptyRecords)).not.toThrow();
        });
      });

      describe("userBlueprints schemas", () => {
        describe("rawUserBlueprintsSchema", () => {
          it("should validate valid raw user blueprints data", () => {
            const validUserBlueprints = {
              "blueprint-1": true,
              "blueprint-2": true,
              "blueprint-3": false,
            };

            expect(() => validateRawUserBlueprints(validUserBlueprints)).not.toThrow();
          });

          it("should validate empty blueprints object", () => {
            const emptyBlueprints = {};
            expect(() => validateRawUserBlueprints(emptyBlueprints)).not.toThrow();
          });

          it("should reject non-boolean values", () => {
            const invalidBlueprints = {
              "blueprint-1": true,
              "blueprint-2": "not a boolean",
            };

            expect(() => validateRawUserBlueprints(invalidBlueprints)).toThrow();
          });

          it("should reject non-object types", () => {
            expect(() => validateRawUserBlueprints([] as any)).toThrow();
            expect(() => validateRawUserBlueprints("string" as any)).toThrow();
            expect(() => validateRawUserBlueprints(123 as any)).toThrow();
          });

          it("should validate real-world blueprint data", () => {
            const realWorldData = {
              "-KnQ865j-qQ21WoUPbd3": true,
              "-L_jADWYOzVoz7tNRFf0": true,
              "-MhFKv_xHyTpGxP5ABCD": false,
            };

            expect(() => validateRawUserBlueprints(realWorldData)).not.toThrow();
          });
        });

        describe("enrichedUserBlueprintsSchema", () => {
          it("should validate valid enriched user blueprints data", () => {
            const validEnrichedBlueprints = {
              blueprintIds: {
                "blueprint-1": true,
                "blueprint-2": true,
              },
              count: 2,
            };

            expect(() => validateEnrichedUserBlueprints(validEnrichedBlueprints)).not.toThrow();
          });

          it("should validate empty blueprints with zero count", () => {
            const emptyEnrichedBlueprints = {
              blueprintIds: {},
              count: 0,
            };

            expect(() => validateEnrichedUserBlueprints(emptyEnrichedBlueprints)).not.toThrow();
          });

          it("should reject missing count field", () => {
            const missingCount = {
              blueprintIds: { "blueprint-1": true },
            };

            expect(() => validateEnrichedUserBlueprints(missingCount)).toThrow();
          });

          it("should reject missing blueprintIds field", () => {
            const missingIds = {
              count: 5,
            };

            expect(() => validateEnrichedUserBlueprints(missingIds)).toThrow();
          });

          it("should reject extra fields due to strict mode", () => {
            const extraFields = {
              blueprintIds: {},
              count: 0,
              extraField: "not allowed",
            };

            expect(() => validateEnrichedUserBlueprints(extraFields)).toThrow();
          });
        });
      });

      describe("userFavorites schemas", () => {
        describe("rawUserFavoritesSchema", () => {
          it("should validate valid raw user favorites data", () => {
            const validUserFavorites = {
              "blueprint-1": true,
              "blueprint-2": false,
              "blueprint-3": true,
            };

            expect(() => validateRawUserFavorites(validUserFavorites)).not.toThrow();
          });

          it("should validate empty favorites object", () => {
            const emptyFavorites = {};
            expect(() => validateRawUserFavorites(emptyFavorites)).not.toThrow();
          });

          it("should reject non-boolean values", () => {
            const invalidFavorites = {
              "blueprint-1": true,
              "blueprint-2": 1,
            };

            expect(() => validateRawUserFavorites(invalidFavorites)).toThrow();
          });

          it("should reject non-object types", () => {
            expect(() => validateRawUserFavorites(null as any)).toThrow();
            expect(() => validateRawUserFavorites(undefined as any)).toThrow();
            expect(() => validateRawUserFavorites([] as any)).toThrow();
          });

          it("should validate real-world favorite data with mixed boolean values", () => {
            const realWorldFavorites = {
              "-KnQ865j-qQ21WoUPbd3": true,
              "-L_jADWYOzVoz7tNRFf0": false,
              "-MhFKv_xHyTpGxP5ABCD": true,
              "-NjKLm_nOpQrStUvWxYZ": false,
            };

            const result = validateRawUserFavorites(realWorldFavorites);
            expect(result).toEqual(realWorldFavorites);
          });
        });

        describe("enrichedUserFavoritesSchema", () => {
          it("should validate valid enriched user favorites data", () => {
            const validEnrichedFavorites = {
              favoriteIds: {
                "blueprint-1": true,
                "blueprint-2": false,
                "blueprint-3": true,
              },
              count: 2, // Only counts true values
            };

            expect(() => validateEnrichedUserFavorites(validEnrichedFavorites)).not.toThrow();
          });

          it("should validate empty favorites with zero count", () => {
            const emptyEnrichedFavorites = {
              favoriteIds: {},
              count: 0,
            };

            expect(() => validateEnrichedUserFavorites(emptyEnrichedFavorites)).not.toThrow();
          });

          it("should reject missing count field", () => {
            const missingCount = {
              favoriteIds: { "blueprint-1": true },
            };

            expect(() => validateEnrichedUserFavorites(missingCount)).toThrow();
          });

          it("should reject missing favoriteIds field", () => {
            const missingIds = {
              count: 3,
            };

            expect(() => validateEnrichedUserFavorites(missingIds)).toThrow();
          });

          it("should reject extra fields due to strict mode", () => {
            const extraFields = {
              favoriteIds: {},
              count: 0,
              additionalData: "not allowed",
            };

            expect(() => validateEnrichedUserFavorites(extraFields)).toThrow();
          });

          it("should reject non-number count values", () => {
            const invalidCount = {
              favoriteIds: {},
              count: "5",
            };

            expect(() => validateEnrichedUserFavorites(invalidCount)).toThrow();
          });
        });
      });

      describe("userCollection schemas", () => {
        describe("rawUserCollectionSchema", () => {
          it("should validate valid raw user collection data", () => {
            const validUserCollection = {
              "blueprint-1": true,
              "blueprint-2": false,
            };

            expect(() => validateRawUserCollection(validUserCollection)).not.toThrow();
          });

          it("should validate empty collection object", () => {
            const emptyCollection = {};
            expect(() => validateRawUserCollection(emptyCollection)).not.toThrow();
          });

          it("should reject non-boolean values", () => {
            const invalidCollection = {
              "blueprint-1": true,
              "blueprint-2": "invalid",
            };

            expect(() => validateRawUserCollection(invalidCollection)).toThrow();
          });
        });

        describe("enrichedUserCollectionSchema", () => {
          it("should validate valid enriched user collection data", () => {
            const validEnrichedCollection = {
              collectionIds: {
                "blueprint-1": true,
                "blueprint-2": false,
              },
              count: 1,
            };

            expect(() => validateEnrichedUserCollection(validEnrichedCollection)).not.toThrow();
          });

          it("should reject missing fields", () => {
            expect(() => validateEnrichedUserCollection({ count: 1 })).toThrow();
            expect(() => validateEnrichedUserCollection({ collectionIds: {} })).toThrow();
          });

          it("should reject extra fields due to strict mode", () => {
            const extraFields = {
              collectionIds: {},
              count: 0,
              extra: "nope",
            };

            expect(() => validateEnrichedUserCollection(extraFields)).toThrow();
          });
        });
      });

      describe("user data validation functions", () => {
        it("validateRawUserBlueprints should provide clear error messages", () => {
          const invalidData = {
            "blueprint-1": "not a boolean",
          };

          expect(() => validateRawUserBlueprints(invalidData)).toThrow(
            /Invalid raw user blueprints/,
          );

          expect(sentryMocks.captureMessage.mock.calls).toStrictEqual([
            [
              "Schema validation failed",
              {
                level: "error",
                fingerprint: ["schema-validation", "raw user blueprints"],
                tags: { component: "schema-validation" },
                extra: {
                  description: "raw user blueprints",
                  errorCount: 1,
                  reportedErrorCount: 1,
                  errors: [
                    {
                      path: "blueprint-1",
                      message: "Invalid input: expected boolean, received string",
                      code: "invalid_type",
                      actualValue: '"not a boolean"',
                      actualType: "string",
                    },
                  ],
                  dataType: "object",
                  dataKeys: ["blueprint-1"],
                  blueprintContexts: [],
                  payloadExcerpt: '{"blueprint-1":"not a boolean"}',
                },
              },
            ],
          ]);
        });

        it("validateEnrichedUserFavorites should provide clear error messages", () => {
          const invalidData = {
            count: 5,
            // Missing favoriteIds
          };

          expect(() => validateEnrichedUserFavorites(invalidData)).toThrow(
            /Invalid enriched user favorites/,
          );

          expect(sentryMocks.captureMessage.mock.calls).toStrictEqual([
            [
              "Schema validation failed",
              {
                level: "error",
                fingerprint: ["schema-validation", "enriched user favorites"],
                tags: { component: "schema-validation" },
                extra: {
                  description: "enriched user favorites",
                  errorCount: 1,
                  reportedErrorCount: 1,
                  errors: [
                    {
                      path: "favoriteIds",
                      message: "Invalid input: expected record, received undefined",
                      code: "invalid_type",
                      actualValue: "undefined",
                      actualType: "undefined",
                    },
                  ],
                  dataType: "object",
                  dataKeys: ["count"],
                  blueprintContexts: [],
                  payloadExcerpt: '{"count":5}',
                },
              },
            ],
          ]);
        });
      });
    });
  });

  describe("blueprintBookSchema", () => {
    it("should handle blueprint books with undefined blueprints field", () => {
      const bookWithUndefinedBlueprints = {
        label: "Test Book",
        description: "A test blueprint book",
      };

      const result = blueprintBookSchema.parse(bookWithUndefinedBlueprints);
      expect(result.blueprints).toEqual([]);
    });

    it("should handle nested blueprint books with undefined blueprints field", () => {
      const nestedBookData = {
        blueprint_book: {
          blueprints: [
            {
              index: 0,
              blueprint: {
                label: "Blueprint 1",
              },
            },
            {
              index: 1,
              blueprint_book: {
                label: "Nested Book",
                // No blueprints field - this was causing the error
              },
            },
          ],
        },
      };

      const consoleCalls: any[][] = [];
      const originalConsoleError = console.error;
      console.error = (...args) => consoleCalls.push(args);

      const result = validateRawBlueprintData(nestedBookData);

      console.error = originalConsoleError;

      expect(result).toBeDefined();
      expect(result.blueprint_book?.blueprints[1].blueprint_book?.blueprints).toEqual([]);
    });

    it("should handle blueprint books with empty array blueprints field", () => {
      const bookWithEmptyBlueprints = {
        label: "Empty Book",
        blueprints: [],
      };

      const result = blueprintBookSchema.parse(bookWithEmptyBlueprints);
      expect(result.blueprints).toEqual([]);
    });

    it("should preserve existing blueprints array when provided", () => {
      const bookWithBlueprints = {
        label: "Book with blueprints",
        blueprints: [
          {
            index: 0,
            blueprint: {
              label: "Test Blueprint",
            },
          },
        ],
      };

      const result = blueprintBookSchema.parse(bookWithBlueprints);
      expect(result.blueprints).toHaveLength(1);
      expect(result.blueprints[0].blueprint?.label).toBe("Test Blueprint");
    });
  });
});
