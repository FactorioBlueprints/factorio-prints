package com.factorioprints.data.pojo;

import com.factorioprints.data.json.UserId;
import org.eclipse.collections.api.list.MutableList;
import org.eclipse.collections.impl.factory.Lists;

public class User
{
    private final UserId userId;
    private final String displayName;
    private final String providerDisplayName;
    private final String email;
    private final Boolean emailVerified;
    private final String photoURL;
    private final String providerId;

    private final MutableList<Blueprint> authoredBlueprints = Lists.mutable.empty();
    private final MutableList<Blueprint> favoriteBlueprints = Lists.mutable.empty();

    public User(
            UserId userId,
            String displayName,
            String providerDisplayName,
            String email,
            Boolean emailVerified,
            String photoURL,
            String providerId)
    {
        this.userId = userId;
        this.displayName = displayName;
        this.providerDisplayName = providerDisplayName;
        this.email = email;
        this.emailVerified = emailVerified;
        this.photoURL = photoURL;
        this.providerId = providerId;
    }

    public UserId getUserId()
    {
        return this.userId;
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

    public void addAuthoredBlueprint(Blueprint authoredBlueprint)
    {
        this.authoredBlueprints.add(authoredBlueprint);
    }

    public void addFavorite(Blueprint blueprint)
    {
        this.favoriteBlueprints.add(blueprint);
    }

    public MutableList<Blueprint> getAuthoredBlueprints()
    {
        return this.authoredBlueprints.asUnmodifiable();
    }

    public MutableList<Blueprint> getFavoriteBlueprints()
    {
        return this.favoriteBlueprints.asUnmodifiable();
    }

    @Override
    public String toString()
    {
        return "User{" +
                "displayName='" + this.displayName + '\'' +
                ", providerDisplayName='" + this.providerDisplayName + '\'' +
                ", email='" + this.email + '\'' +
                ", userId='" + this.userId + '\'' +
                '}';
    }
}
