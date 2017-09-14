package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;
import java.util.Map;

@JsonPropertyOrder(alphabetic = true)
public class JsonFactorioDatabase
{
    private final Map<BlueprintKey, JsonBlueprintSummary> blueprintSummaries;
    private final Map<BlueprintKey, JsonBlueprint> blueprints;
    private final Map<String, Map<String, Map<BlueprintKey, Boolean>>> byTag;
    private final Map<UserId, JsonUser> users;

    private final Map<UserId, Boolean> moderators;
    private final Map<String, List<String>> tags;
    private final Map<BlueprintKey, String> thumbnails;

    public JsonFactorioDatabase(
            Map<BlueprintKey, JsonBlueprintSummary> blueprintSummaries,
            Map<BlueprintKey, JsonBlueprint> blueprints,
            Map<String, Map<String, Map<BlueprintKey, Boolean>>> byTag,
            Map<UserId, JsonUser> users,
            Map<UserId, Boolean> moderators,
            Map<String, List<String>> tags,
            Map<BlueprintKey, String> thumbnails)
    {
        this.blueprintSummaries = blueprintSummaries;
        this.blueprints = blueprints;
        this.byTag = byTag;
        this.users = users;
        this.moderators = moderators;
        this.tags = tags;
        this.thumbnails = thumbnails;
    }

    public Map<BlueprintKey, JsonBlueprintSummary> getBlueprintSummaries()
    {
        return this.blueprintSummaries;
    }

    public Map<BlueprintKey, JsonBlueprint> getBlueprints()
    {
        return this.blueprints;
    }

    public Map<String, Map<String, Map<BlueprintKey, Boolean>>> getByTag()
    {
        return this.byTag;
    }

    public Map<UserId, JsonUser> getUsers()
    {
        return this.users;
    }

    public Map<UserId, Boolean> getModerators()
    {
        return this.moderators;
    }

    public Map<String, List<String>> getTags()
    {
        return this.tags;
    }

    public Map<BlueprintKey, String> getThumbnails()
    {
        return this.thumbnails;
    }
}
