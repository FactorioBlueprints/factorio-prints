package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.LinkedHashMap;
import java.util.Map;

@JsonPropertyOrder(alphabetic = true)
public class JsonUser
{
    private final String displayName;
    private final String providerDisplayName;
    private final String email;
    private final Boolean emailVerified;
    private final String photoURL;
    private final String providerId;
    private final Map<BlueprintKey, Boolean> favorites;
    private final Map<BlueprintKey, Boolean> blueprints;

    public JsonUser(
            String displayName,
            String providerDisplayName, String email,
            Boolean emailVerified,
            String photoURL,
            String providerId,
            Map<BlueprintKey, Boolean> favorites,
            Map<BlueprintKey, Boolean> blueprints)
    {
        this.displayName = displayName;
        this.providerDisplayName = providerDisplayName;
        this.email = email;
        this.emailVerified = emailVerified;
        this.photoURL = photoURL;
        this.providerId = providerId;
        this.favorites = favorites == null ? new LinkedHashMap<>() : favorites;
        this.blueprints = blueprints == null ? new LinkedHashMap<>() : blueprints;
    }

    public String getDisplayName()
    {
        return this.displayName;
    }

    public String getProviderDisplayName()
    {
        return this.providerDisplayName;
    }

    public String getEmail()
    {
        return this.email;
    }

    public Boolean getEmailVerified()
    {
        return this.emailVerified;
    }

    public String getPhotoURL()
    {
        return this.photoURL;
    }

    public String getProviderId()
    {
        return this.providerId;
    }

    public Map<BlueprintKey, Boolean> getFavorites()
    {
        return this.favorites;
    }

    public Map<BlueprintKey, Boolean> getBlueprints()
    {
        return this.blueprints;
    }
}
