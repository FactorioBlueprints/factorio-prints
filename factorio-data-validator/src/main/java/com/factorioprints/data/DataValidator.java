package com.factorioprints.data;

import com.factorioprints.data.json.*;
import com.factorioprints.data.pojo.*;
import com.fasterxml.jackson.annotation.JsonCreator.Mode;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import org.apache.commons.lang3.text.translate.UnicodeUnescaper;
import org.eclipse.collections.api.RichIterable;
import org.eclipse.collections.api.list.ImmutableList;
import org.eclipse.collections.api.list.MutableList;
import org.eclipse.collections.api.map.MutableMap;
import org.eclipse.collections.api.multimap.list.MutableListMultimap;
import org.eclipse.collections.api.set.MutableSet;
import org.eclipse.collections.api.tuple.Pair;
import org.eclipse.collections.impl.factory.Lists;
import org.eclipse.collections.impl.factory.Maps;
import org.eclipse.collections.impl.factory.Multimaps;
import org.eclipse.collections.impl.factory.Sets;
import org.eclipse.collections.impl.list.fixed.ArrayAdapter;
import org.eclipse.collections.impl.map.mutable.MapAdapter;
import org.eclipse.collections.impl.set.mutable.SetAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;

public class DataValidator
{
    private static final Logger LOGGER = LoggerFactory.getLogger(DataValidator.class);
    private int blueprintsWithFilename;
    private int totalBlueprints;
    private int usersWithNoDisplayName;
    private int usersWithProviderDisplayName;
    private int usersWithNoEmailAddress;
    private int usersWithNothing;
    private int usersWhoFavoritedOwn;
    private int userMissingAuthoredBlueprint;
    private int blueprintsMissingAuthor;
    public static final Instant EPOCH = Instant.parse("2017-01-01T00:00:00.000Z");

    public static void main(String[] args) throws IOException
    {
        String content = new String(Files.readAllBytes(Paths.get("../data/factorio-blueprints-export.json")));
        DefaultPrettyPrinter defaultPrettyPrinter = new MyDefaultPrettyPrinter();
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new ParameterNamesModule(Mode.PROPERTIES))
                .registerModule(new Jdk8Module())
                .registerModule(new JavaTimeModule())
                .disable(DeserializationFeature.READ_DATE_TIMESTAMPS_AS_NANOSECONDS)
                .disable(SerializationFeature.WRITE_DATE_TIMESTAMPS_AS_NANOSECONDS)
                .setSerializationInclusion(Include.NON_EMPTY)
                .setDefaultPrettyPrinter(defaultPrettyPrinter)
                .enable(SerializationFeature.INDENT_OUTPUT)
                .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);

        JsonFactorioDatabase sourceDatabase = mapper.readValue(content, JsonFactorioDatabase.class);
        DataValidator dataValidator = new DataValidator();
        FactorioDatabase databasePojo = dataValidator.cleanse(sourceDatabase);
        dataValidator.logStatistics();
        JsonFactorioDatabase targetDatabase = DataValidator.serialize(databasePojo);
        String escapedResults = mapper.writeValueAsString(targetDatabase);
        String unescapedResults = new UnicodeUnescaper().translate(escapedResults);
        try (FileWriter writer = new FileWriter("../data/factorio-blueprints-cleansed.json"))
        {
            writer.write(unescapedResults);
        }
    }

    private void logStatistics()
    {
        LOGGER.info("{} total blueprints", this.totalBlueprints);
        LOGGER.info("{} blueprints have a filename", this.blueprintsWithFilename);
        LOGGER.info("{} users with no displayName", this.usersWithNoDisplayName);
        LOGGER.info("{} users with no displayName but do have a provider display name", this.usersWithProviderDisplayName);
        LOGGER.info("{} users with no email address", this.usersWithNoEmailAddress);
        LOGGER.info("{} users with nothing", this.usersWithNothing);
        LOGGER.info("{} times people favorited their own blueprint", this.usersWhoFavoritedOwn);
        LOGGER.info("{} times user was missing an authored blueprint", this.userMissingAuthoredBlueprint);
        LOGGER.info("{} times user was missing an authored blueprint", this.blueprintsMissingAuthor);
    }

    private FactorioDatabase cleanse(JsonFactorioDatabase sourceDatabase)
    {
        MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints = MapAdapter.adapt(sourceDatabase.getBlueprints());
        MutableMap<UserId, JsonUser> jsonUsers = MapAdapter.adapt(sourceDatabase.getUsers());
        MutableMap<BlueprintKey, JsonBlueprintSummary> jsonBlueprintSummaries = MapAdapter.adapt(sourceDatabase.getBlueprintSummaries());
        MutableMap<String, Map<String, Map<BlueprintKey, Boolean>>> jsonByTag = MapAdapter.adapt(sourceDatabase.getByTag());
        MutableMap<UserId, Boolean> jsonModerators = MapAdapter.adapt(sourceDatabase.getModerators());
        MutableMap<String, List<String>> jsonTags = MapAdapter.adapt(sourceDatabase.getTags());
        MutableMap<BlueprintKey, String> jsonThumbnails = MapAdapter.adapt(sourceDatabase.getThumbnails());
        MutableMap<BlueprintKey, JsonBlueprintPrivate> jsonBlueprintPrivates = MapAdapter.adapt(sourceDatabase.getBlueprintPrivates());

        MutableMap<BlueprintKey, Blueprint> cleansedBlueprints = this.cleanseBlueprints(jsonBlueprints);
        this.totalBlueprints = cleansedBlueprints.size();

        MutableMap<UserId, User> cleansedUsers = this.cleanseUsers(
                jsonUsers,
                jsonBlueprints,
                cleansedBlueprints);

        this.checkAuthors(cleansedBlueprints, cleansedUsers, jsonBlueprints);
        this.checkFavorites(cleansedBlueprints, cleansedUsers, jsonBlueprints);

        ImmutableList<BlueprintSummary> cleansedBlueprintSummaries = this.cleanseBlueprintSummaries(
                jsonBlueprintSummaries,
                cleansedBlueprints);

        MutableListMultimap<String, Blueprint> cleansedTags = this.cleanseTags(jsonTags, jsonByTag, cleansedBlueprints);

        MutableMap<BlueprintKey, BlueprintPrivates> cleansedBlueprintPrivates = this.cleanseBlueprintPrivates(
                cleansedBlueprints,
                jsonThumbnails,
                jsonBlueprintPrivates);

        this.usersWithNoDisplayName = cleansedUsers.count(user -> user.getDisplayName() == null && user.getProviderDisplayName() == null);
        this.usersWithProviderDisplayName = cleansedUsers.count(user -> user.getDisplayName() == null && user.getProviderDisplayName() != null);
        this.usersWithNoEmailAddress = cleansedUsers.count(user -> user.getEmail() == null);
        this.usersWithNothing = cleansedUsers.count(user ->
                user.getDisplayName() == null
                        && user.getProviderDisplayName() == null
                        && user.getEmail() == null
                        && user.getAuthoredBlueprints().isEmpty()
                        && user.getFavoriteBlueprints().isEmpty());

        return new FactorioDatabase(
                cleansedBlueprints,
                cleansedUsers,
                cleansedBlueprintSummaries,
                cleansedTags,
                jsonModerators,
                jsonTags,
                jsonThumbnails,
                cleansedBlueprintPrivates);
    }

    private MutableMap<BlueprintKey, BlueprintPrivates> cleanseBlueprintPrivates(
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints,
            MutableMap<BlueprintKey, String> jsonThumbnails,
            MutableMap<BlueprintKey, JsonBlueprintPrivate> jsonBlueprintPrivates)
    {
        MutableMap<BlueprintKey, BlueprintPrivates> result = MapAdapter.adapt(new LinkedHashMap<>());

        jsonBlueprintPrivates.forEach((blueprintKey, jsonBlueprintPrivate) -> result.put(blueprintKey, new BlueprintPrivates(
                jsonBlueprintPrivate.getFileName(),
                jsonBlueprintPrivate.getImageUrl(),
                jsonBlueprintPrivate.getThumbnail(),
                jsonBlueprintPrivate.getDeletehash())));

        cleansedBlueprints.forEach((blueprintKey, blueprint) -> {
            BlueprintPrivates existingBlueprintPrivates = result.get(blueprintKey);
            BlueprintPrivates blueprintPrivatesFromData = new BlueprintPrivates(
                    blueprint.getFileName(),
                    blueprint.getImageUrl(),
                    jsonThumbnails.get(blueprintKey),
                    blueprint.getImage().getDeletehash());
            if (existingBlueprintPrivates == null)
            {
                result.put(blueprintKey, blueprintPrivatesFromData);
            }
            else if (!existingBlueprintPrivates.equals(blueprintPrivatesFromData))
            {
                throw new AssertionError();
            }
        });

        return result;
    }

    private MutableMap<BlueprintKey, Blueprint> cleanseBlueprints(MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints)
    {
        MutableMap<BlueprintKey, Blueprint> cleansedBlueprints = MapAdapter.adapt(new LinkedHashMap<>());
        jsonBlueprints.forEachKeyValue((blueprintKey, jsonBlueprint) -> cleansedBlueprints.put(blueprintKey, this.cleanseBlueprint(blueprintKey, jsonBlueprint)));
        return cleansedBlueprints;
    }

    private void checkAuthors(
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints,
            MutableMap<UserId, User> cleansedUsers,
            MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints)
    {
        jsonBlueprints.forEachKeyValue((blueprintKey, jsonBlueprint) -> {
            UserId userId = jsonBlueprint.getAuthor().getUserId();
            UserId authorId = jsonBlueprint.getAuthorId();
            if (authorId != null && !userId.equals(authorId))
            {
                throw new AssertionError();
            }
            User author = cleansedUsers.get(userId);
            Blueprint blueprint = cleansedBlueprints.get(blueprintKey);
            if (blueprint.getAuthor() != author)
            {
                if (blueprint.getAuthor() == null)
                {
                    LOGGER.info("Blueprint {} missing author {}", blueprint.getTitle(), author.getDisplayName());
                    this.blueprintsMissingAuthor++;
                    blueprint.setAuthor(author);
                    author.addAuthoredBlueprint(blueprint);
                }
                else
                {
                    throw new AssertionError();
                }
            }
        });
    }

    private MutableListMultimap<String, Blueprint> cleanseTags(
            MutableMap<String, List<String>> jsonTags,
            MutableMap<String, Map<String, Map<BlueprintKey, Boolean>>> jsonByTag,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        MutableListMultimap<String, Blueprint> tagsEmbeddedInBlueprints = (MutableListMultimap<String, Blueprint>) cleansedBlueprints.valuesView().groupByEach(Blueprint::getTags);
        MutableListMultimap<String, Blueprint> tagsFromByTag = Multimaps.mutable.list.empty();

        jsonByTag.forEachKeyValue((tagPrefix, map1) ->
                map1.forEach((tagSuffix, map2) -> {
                    map2.forEach((blueprintKey, aBoolean) -> {
                        if (aBoolean)
                        {
                            Blueprint blueprint = cleansedBlueprints.get(blueprintKey);
                            String tag = "/" + tagPrefix + "/" + tagSuffix + "/";
                            if (blueprint == null)
                            {
                                LOGGER.info("Cannot find blueprint {} with tag {}", blueprintKey, tag);
                            }
                            else
                            {
                                tagsFromByTag.put(tag, blueprint);
                            }
                        }
                    });
                }));

        tagsFromByTag.forEachKeyValue((tag, blueprint) -> {
            if (!blueprint.getTags().contains(tag))
            {
                LOGGER.info("Blueprint {} missing tag {}.", blueprint.getTitle(), tag);
                blueprint.addTag(tag);
            }
        });

        return tagsFromByTag;
    }

    private void checkFavorites(
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints,
            MutableMap<UserId, User> cleansedUsers,
            MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints)
    {
        cleansedBlueprints.valuesView().each(blueprint -> {
            JsonBlueprint jsonBlueprint = jsonBlueprints.get(blueprint.getKey());
            MutableSet<User> favoritesEmbeddedInBlueprint = MapAdapter.adapt(jsonBlueprint.getFavorites())
                    .select((ignored, aBoolean) -> aBoolean)
                    .keysView()
                    .collect(cleansedUsers::get)
                    .reject(user -> blueprint.getAuthor() == user)
                    .into(SetAdapter.adapt(new LinkedHashSet<>()));
            MutableSet<User> favoritesEmbeddedInUsers = blueprint.getFavorites().asLazy().into(SetAdapter.adapt(new LinkedHashSet<>()));
            MutableSet<User> onlyEmbeddedInUser = Sets.difference(favoritesEmbeddedInUsers, favoritesEmbeddedInBlueprint);
            MutableSet<User> onlyEmbeddedInBlueprint = Sets.difference(favoritesEmbeddedInBlueprint, favoritesEmbeddedInUsers);

            if (onlyEmbeddedInUser.notEmpty())
            {
                throw new AssertionError(onlyEmbeddedInUser.makeString());
            }
            for (User eachEmbeddedInBlueprint : onlyEmbeddedInBlueprint)
            {
                LOGGER.info("User {} favorite {} info only embedded in blueprint.", eachEmbeddedInBlueprint.getDisplayName(), blueprint.getTitle());
                blueprint.addFavorite(eachEmbeddedInBlueprint);
                eachEmbeddedInBlueprint.addFavorite(blueprint);
            }
        });
    }

    private ImmutableList<BlueprintSummary> cleanseBlueprintSummaries(
            MutableMap<BlueprintKey, JsonBlueprintSummary> jsonBlueprintSummaries,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        RichIterable<BlueprintSummary> blueprintSummaries = jsonBlueprintSummaries.keyValuesView()
                .collect(pair -> {
                    BlueprintKey blueprintKey = pair.getOne();
                    JsonBlueprintSummary jsonBlueprintSummary = pair.getTwo();

                    int numberOfFavorites = jsonBlueprintSummary.getNumberOfFavorites();

                    Blueprint blueprint = cleansedBlueprints.get(blueprintKey);

                    int blueprintNumberOfFavorites = blueprint.getNumberOfFavorites();
                    int blueprintFavoritesSize = blueprint.getFavorites().size();

                    if (blueprintNumberOfFavorites != blueprintFavoritesSize)
                    {
                        LOGGER.info("Blueprint {} has {} favorites but blueprint numberOfFavorites is {}", blueprint.getTitle(), blueprintFavoritesSize, blueprintNumberOfFavorites);
                        blueprint.setNumberOfFavorites(blueprintFavoritesSize);
                    }

                    if (numberOfFavorites != blueprintFavoritesSize)
                    {
                        LOGGER.info("Blueprint {} has {} favorites but summary numberOfFavorites is {}", blueprint.getTitle(), blueprintFavoritesSize, numberOfFavorites);
                    }

                    if (!Objects.equals(blueprint.getTitle(), jsonBlueprintSummary.getTitle()))
                    {
                        throw new AssertionError();
                    }

                    if (!Objects.equals(blueprint.getImage().getId(), jsonBlueprintSummary.getImgurId()))
                    {
                        throw new AssertionError();
                    }

                    if (!Objects.equals(blueprint.getImage().getType(), jsonBlueprintSummary.getImgurType()))
                    {
                        throw new AssertionError();
                    }

                    Instant lastUpdatedDate = jsonBlueprintSummary.getLastUpdatedDate();
                    return new BlueprintSummary(
                            blueprintKey,
                            jsonBlueprintSummary.getTitle(),
                            jsonBlueprintSummary.getImgurId(),
                            jsonBlueprintSummary.getImgurType(),
                            blueprintFavoritesSize,
                            lastUpdatedDate == null ? EPOCH : lastUpdatedDate);
                });
        return blueprintSummaries.toList().toImmutable();
    }

    private MutableMap<UserId, User> cleanseUsers(
            MutableMap<UserId, JsonUser> jsonUsers,
            MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        return MapAdapter.<UserId, User>adapt(new LinkedHashMap<>()).collectKeysAndValues(
                jsonUsers.keyValuesView(),
                Pair::getOne,
                userIdUserPair -> this.cleanseUser(userIdUserPair.getOne(), userIdUserPair.getTwo(), jsonBlueprints, cleansedBlueprints));
    }

    private User cleanseUser(
            UserId userId,
            JsonUser jsonUser,
            MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        User user = new User(
                userId,
                jsonUser.getDisplayName(),
                jsonUser.getProviderDisplayName(),
                jsonUser.getEmail(),
                jsonUser.getEmailVerified(),
                jsonUser.getPhotoURL(),
                jsonUser.getProviderId());

        this.cleanseAuthoredBlueprints(user, MapAdapter.adapt(jsonUser.getBlueprints()), jsonBlueprints, cleansedBlueprints);
        this.cleanseFavorites(user, MapAdapter.adapt(jsonUser.getFavorites()), cleansedBlueprints);

        return user;
    }

    private void cleanseAuthoredBlueprints(
            User user,
            MutableMap<BlueprintKey, Boolean> authoredBlueprints,
            MutableMap<BlueprintKey, JsonBlueprint> jsonBlueprints,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        authoredBlueprints.forEachKeyValue((authoredBlueprintKey, aBoolean) -> {
            assert aBoolean : authoredBlueprintKey;
        });

        authoredBlueprints.forEachKey(authoredBlueprintKey -> {
            Blueprint authoredBlueprint = cleansedBlueprints.get(authoredBlueprintKey);
            if (authoredBlueprint == null)
            {
                this.userMissingAuthoredBlueprint++;
                LOGGER.info("User {} with missing authored blueprint {}", user.getDisplayName(), authoredBlueprintKey);
            }
            else
            {
                UserId blueprintAuthorId = jsonBlueprints.get(authoredBlueprintKey).getAuthor().getUserId();
                if (!Objects.equals(blueprintAuthorId, user.getUserId()))
                {
                    throw new AssertionError();
                }
                authoredBlueprint.setAuthor(user);
                user.addAuthoredBlueprint(authoredBlueprint);
            }
        });
    }

    private void cleanseFavorites(
            User user,
            MutableMap<BlueprintKey, Boolean> userFavorites,
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints)
    {
        userFavorites.forEachKeyValue((favoriteBlueprintKey, aBoolean) -> {
            Blueprint favoriteBlueprint = cleansedBlueprints.get(favoriteBlueprintKey);

            if (favoriteBlueprint == null)
            {
                LOGGER.info("Could not find user {}'s favorite {}", user.getDisplayName(), favoriteBlueprintKey);
            }
            else if (!aBoolean)
            {
                LOGGER.info("User {} set Blueprint {} to favorite=false", user.getDisplayName(), favoriteBlueprint.getTitle());
            }
            else if (favoriteBlueprint.getAuthor() == user)
            {
                this.usersWhoFavoritedOwn++;
                LOGGER.info("User {} favorited their own blueprint {}", user.getDisplayName(), favoriteBlueprint.getTitle());
            }
            else
            {
                favoriteBlueprint.addFavorite(user);
                user.addFavorite(favoriteBlueprint);
            }
        });
    }

    private Blueprint cleanseBlueprint(
            BlueprintKey blueprintKey,
            JsonBlueprint jsonBlueprint)
    {
        String title = jsonBlueprint.getTitle();
        String blueprintString = jsonBlueprint.getBlueprintString();
        String descriptionMarkdown = jsonBlueprint.getDescriptionMarkdown();
        MutableList<String> tags = jsonBlueprint.getTags();

        Image image = DataValidator.cleanseImage(jsonBlueprint.getImage());
        String imageUrl = jsonBlueprint.getImageUrl();

        Instant createdDate = jsonBlueprint.getCreatedDate();
        Instant lastUpdatedDate = jsonBlueprint.getLastUpdatedDate();

        int numberOfFavorites = jsonBlueprint.getNumberOfFavorites();

        String fileName = jsonBlueprint.getFileName();
        @Deprecated
        String thumbnail = jsonBlueprint.getThumbnail();

        // TODO: Author
        // TODO: Favorites
        Blueprint result = new Blueprint(
                blueprintKey,
                title,
                blueprintString,
                descriptionMarkdown,
                Lists.mutable.withAll(tags),
                image,
                imageUrl,
                createdDate,
                lastUpdatedDate,
                numberOfFavorites,
                fileName);

        if (fileName != null)
        {
            this.blueprintsWithFilename++;
        }

        return result;
    }

    private static Image cleanseImage(JsonImage jsonImage)
    {
        return new Image(
                jsonImage.getId(),
                jsonImage.getType(),
                jsonImage.getDeletehash(),
                jsonImage.getHeight(),
                jsonImage.getWidth());
    }

    private static JsonFactorioDatabase serialize(FactorioDatabase factorioDatabase)
    {
        ImmutableList<BlueprintSummary> cleansedBlueprintSummaries = factorioDatabase.getCleansedBlueprintSummaries();
        MutableMap<BlueprintKey, JsonBlueprintSummary> blueprintSummaries = MapAdapter.adapt(new LinkedHashMap<>());
        blueprintSummaries.collectKeysAndValues(
                cleansedBlueprintSummaries,
                BlueprintSummary::getBlueprintKey,
                blueprintSummary -> new JsonBlueprintSummary(
                        blueprintSummary.getTitle(),
                        blueprintSummary.getImgurId(),
                        blueprintSummary.getImgurType(),
                        blueprintSummary.getNumberOfFavorites(),
                        blueprintSummary.getLastUpdatedDate()));

        MutableMap<BlueprintKey, Blueprint> cleansedBlueprints = factorioDatabase.getCleansedBlueprints();
        MutableMap<BlueprintKey, JsonBlueprint> blueprints = MapAdapter.adapt(new LinkedHashMap<>());

        cleansedBlueprints.forEachKeyValue(
                (blueprintKey, blueprint) -> blueprints.put(blueprintKey, new JsonBlueprint(
                        blueprint.getTitle(),
                        blueprint.getBlueprintString(),
                        blueprint.getDescriptionMarkdown(),
                        blueprint.getTags(),
                        new JsonImage(
                                blueprint.getImage().getId(),
                                blueprint.getImage().getType(),
                                blueprint.getImage().getDeletehash(),
                                blueprint.getImage().getHeight(),
                                blueprint.getImage().getWidth(),
                                null),
                        blueprint.getImageUrl(),
                        new JsonAuthor(
                                blueprint.getAuthor().getUserId(),
                                null,
                                null,
                                false,
                                null,
                                null,
                                null,
                                null),
                        blueprint.getAuthor().getUserId(),
                        blueprint.getCreatedDate(),
                        blueprint.getLastUpdatedDate(),
                        null,
                        blueprint.getNumberOfFavorites(),
                        blueprint.getFileName(),
                        null
                )));

        MutableListMultimap<String, Blueprint> cleansedTags = factorioDatabase.getCleansedTags();
        MutableMap<String, Map<String, Map<BlueprintKey, Boolean>>> byTag = Maps.mutable.empty();
        cleansedTags.forEachKeyValue((joinedTag, blueprint) -> {
            MutableList<String> splitTagParts = ArrayAdapter.adapt(joinedTag.split("\\/"));
            if (splitTagParts.size() != 3 || !splitTagParts.get(0).equals(""))
            {
                throw new AssertionError();
            }

            byTag
                    .compute(splitTagParts.get(1), (ignoredKey, map) -> map == null ? new LinkedHashMap<>() : map)
                    .compute(splitTagParts.get(2), (ignoredKey, map) -> map == null ? new LinkedHashMap<>() : map)
                    .put(blueprint.getKey(), true);
        });

        MutableMap<UserId, User> cleansedUsers = factorioDatabase.getCleansedUsers();
        MutableMap<UserId, JsonUser> users = MapAdapter.adapt(new LinkedHashMap<>());
        users.collectKeysAndValues(
                cleansedUsers,
                User::getUserId,
                user -> new JsonUser(
                        user.getDisplayName(),
                        user.getProviderDisplayName(),
                        user.getEmail(),
                        user.getEmailVerified(),
                        user.getPhotoURL(),
                        user.getProviderId(),
                        MapAdapter.adapt(new LinkedHashMap<BlueprintKey, Boolean>()).collectKeysAndValues(
                                user.getFavoriteBlueprints(),
                                Blueprint::getKey,
                                blueprint -> true),
                        MapAdapter.adapt(new LinkedHashMap<BlueprintKey, Boolean>()).collectKeysAndValues(
                                user.getAuthoredBlueprints(),
                                Blueprint::getKey,
                                blueprint -> true)));

        MutableMap<BlueprintKey, JsonBlueprintPrivate> blueprintPrivates = MapAdapter.adapt(new LinkedHashMap<>());
        factorioDatabase.getCleansedBlueprintPrivates()
                .forEach((blueprintKey, eachBlueprintPrivates) -> blueprintPrivates.put(blueprintKey, new JsonBlueprintPrivate(
                        eachBlueprintPrivates.getFileName(),
                        eachBlueprintPrivates.getImageUrl(),
                        eachBlueprintPrivates.getThumbnail(),
                        eachBlueprintPrivates.getDeletehash())));

        return new JsonFactorioDatabase(
                blueprintSummaries,
                blueprints,
                byTag,
                users,
                factorioDatabase.getJsonModerators(),
                factorioDatabase.getJsonTags(),
                factorioDatabase.getJsonThumbnails(),
                blueprintPrivates);
    }

    private static class MyDefaultPrettyPrinter extends DefaultPrettyPrinter
    {
        private MyDefaultPrettyPrinter()
        {
            this._arrayIndenter = DefaultIndenter.SYSTEM_LINEFEED_INSTANCE;
        }

        @Override
        public DefaultPrettyPrinter createInstance()
        {
            return this;
        }

        @Override
        public void writeObjectFieldValueSeparator(JsonGenerator jsonGenerator) throws IOException
        {
            jsonGenerator.writeRaw(this._separators.getObjectFieldValueSeparator() + " ");
        }
    }
}
