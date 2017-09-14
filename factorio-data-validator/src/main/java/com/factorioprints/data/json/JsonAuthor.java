package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.Map;

@JsonPropertyOrder(alphabetic = true)
public class JsonAuthor
{
    private final UserId userId;

    public JsonAuthor(
            UserId userId,
            @Deprecated String displayName,
            @Deprecated String email,
            @Deprecated Boolean emailVerified,
            @Deprecated String photoURL,
            @Deprecated String providerId,
            @Deprecated Map<BlueprintKey, Boolean> blueprints,
            @Deprecated String providerDisplayName)
    {
        this.userId = userId;
    }

    public UserId getUserId()
    {
        return this.userId;
    }
}
