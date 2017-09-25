package com.factorioprints.data.pojo;

import com.factorioprints.data.json.BlueprintKey;
import com.factorioprints.data.json.JsonBlueprintPrivate;
import com.factorioprints.data.json.UserId;
import org.eclipse.collections.api.list.ImmutableList;
import org.eclipse.collections.api.map.MutableMap;
import org.eclipse.collections.api.multimap.list.MutableListMultimap;

import java.util.List;
import java.util.Map;

public class FactorioDatabase
{
    private final MutableMap<BlueprintKey, Blueprint> cleansedBlueprints;
    private final MutableMap<UserId, User> cleansedUsers;
    private final ImmutableList<BlueprintSummary> cleansedBlueprintSummaries;
    private final MutableListMultimap<String, Blueprint> cleansedTags;
    private final MutableMap<UserId, Boolean> jsonModerators;
    private final MutableMap<String, List<String>> jsonTags;
    private final MutableMap<BlueprintKey, String> jsonThumbnails;
    private final MutableMap<BlueprintKey, BlueprintPrivates> cleansedBlueprintPrivates;

    public FactorioDatabase(
            MutableMap<BlueprintKey, Blueprint> cleansedBlueprints,
            MutableMap<UserId, User> cleansedUsers,
            ImmutableList<BlueprintSummary> cleansedBlueprintSummaries,
            MutableListMultimap<String, Blueprint> cleansedTags,
            MutableMap<UserId, Boolean> jsonModerators,
            MutableMap<String, List<String>> jsonTags,
            MutableMap<BlueprintKey, String> jsonThumbnails,
            MutableMap<BlueprintKey, BlueprintPrivates> cleansedBlueprintPrivates)
    {
        this.cleansedBlueprints = cleansedBlueprints;
        this.cleansedUsers = cleansedUsers;
        this.cleansedBlueprintSummaries = cleansedBlueprintSummaries;
        this.cleansedTags = cleansedTags;
        this.jsonModerators = jsonModerators;
        this.jsonTags = jsonTags;
        this.jsonThumbnails = jsonThumbnails;
        this.cleansedBlueprintPrivates = cleansedBlueprintPrivates;
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

    public MutableMap<BlueprintKey, BlueprintPrivates> getCleansedBlueprintPrivates()
    {
        return this.cleansedBlueprintPrivates;
    }
}
