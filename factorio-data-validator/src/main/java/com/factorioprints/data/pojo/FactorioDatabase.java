package com.factorioprints.data.pojo;

import com.factorioprints.data.json.BlueprintKey;
import com.factorioprints.data.json.UserId;
import org.eclipse.collections.api.list.ImmutableList;
import org.eclipse.collections.api.map.MutableMap;
import org.eclipse.collections.api.multimap.list.MutableListMultimap;

import java.util.List;

public class FactorioDatabase
{
    private final MutableMap<BlueprintKey, Blueprint> cleansedBlueprints;
    private final MutableMap<UserId, User> cleansedUsers;
    private final ImmutableList<BlueprintSummary> cleansedBlueprintSummaries;
    private final MutableListMultimap<String, Blueprint> cleansedTags;
    private final MutableMap<UserId, Boolean> jsonModerators;
    private final MutableMap<String, List<String>> jsonTags;
    private final MutableMap<BlueprintKey, String> jsonThumbnails;

    public FactorioDatabase(
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints,
            MutableMap<UserId, User> cleansedUsers,
            ImmutableList<BlueprintSummary> cleansedBlueprintSummaries,
            MutableListMultimap<String, Blueprint> cleansedTags,
            MutableMap<UserId, Boolean> jsonModerators,
            MutableMap<String, List<String>> jsonTags,
            MutableMap<BlueprintKey, String> jsonThumbnails)
    {
        this.cleansedBlueprints = cleansedBlueprints;
        this.cleansedUsers = cleansedUsers;
        this.cleansedBlueprintSummaries = cleansedBlueprintSummaries;
        this.cleansedTags = cleansedTags;
        this.jsonModerators = jsonModerators;
        this.jsonTags = jsonTags;
        this.jsonThumbnails = jsonThumbnails;
    }

    public MutableMap<BlueprintKey, Blueprint> getCleansedBlueprints()
    {
        return this.cleansedBlueprints;
    }

    public MutableMap<UserId, User> getCleansedUsers()
    {
        return this.cleansedUsers;
    }

    public ImmutableList<BlueprintSummary> getCleansedBlueprintSummaries()
    {
        return this.cleansedBlueprintSummaries;
    }

    public MutableListMultimap<String, Blueprint> getCleansedTags()
    {
        return this.cleansedTags;
    }

    public MutableMap<UserId, Boolean> getJsonModerators()
    {
        return this.jsonModerators;
    }

    public MutableMap<String, List<String>> getJsonTags()
    {
        return this.jsonTags;
    }

    public MutableMap<BlueprintKey, String> getJsonThumbnails()
    {
        return this.jsonThumbnails;
    }
}
