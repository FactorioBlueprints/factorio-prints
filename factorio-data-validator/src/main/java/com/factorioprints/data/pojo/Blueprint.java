package com.factorioprints.data.pojo;

import com.factorioprints.data.json.BlueprintKey;
import org.eclipse.collections.api.list.MutableList;
import org.eclipse.collections.impl.factory.Lists;

import java.time.Instant;
import java.util.Objects;

public class Blueprint
{
    private final BlueprintKey key;
    private final String title;
    private final String blueprintString;
    private final String descriptionMarkdown;
    private final MutableList<String> tags;
    private final Image image;
    private final String imageUrl;
    private final Instant createdDate;
    private final Instant lastUpdatedDate;
    private int numberOfFavorites;
    private final String fileName;

    private User author;
    private final MutableList<User> favorites = Lists.mutable.empty();

    public Blueprint(
            BlueprintKey key,
            String title,
            String blueprintString,
            String descriptionMarkdown,
            MutableList<String> tags,
            Image image,
            String imageUrl,
            Instant createdDate,
            Instant lastUpdatedDate,
            int numberOfFavorites,
            String fileName)
    {
        this.key = key;
        this.title = title;
        this.blueprintString = blueprintString;
        this.descriptionMarkdown = descriptionMarkdown;
        this.tags = Objects.requireNonNull(tags);
        this.image = image;
        this.imageUrl = imageUrl;
        this.createdDate = createdDate;
        this.lastUpdatedDate = lastUpdatedDate;
        this.numberOfFavorites = numberOfFavorites;
        this.fileName = fileName;
    }

    public BlueprintKey getKey()
    {
        return this.key;
    }

    public String getTitle()
    {
        return this.title;
    }

    public String getBlueprintString()
    {
        return this.blueprintString;
    }

    public String getDescriptionMarkdown()
    {
        return this.descriptionMarkdown;
    }

    public MutableList<String> getTags()
    {
        return this.tags.asUnmodifiable();
    }

    public Image getImage()
    {
        return this.image;
    }

    public String getImageUrl()
    {
        return this.imageUrl;
    }

    public Instant getCreatedDate()
    {
        return this.createdDate;
    }

    public Instant getLastUpdatedDate()
    {
        return this.lastUpdatedDate;
    }

    public int getNumberOfFavorites()
    {
        return this.numberOfFavorites;
    }

    public String getFileName()
    {
        return this.fileName;
    }

    public void setAuthor(User author)
    {
        this.author = author;
    }

    public User getAuthor()
    {
        return this.author;
    }

    public void addFavorite(User user)
    {
        this.favorites.add(user);
    }

    public MutableList<User> getFavorites()
    {
        return this.favorites;
    }

    public void setNumberOfFavorites(int numberOfFavorites)
    {
        this.numberOfFavorites = numberOfFavorites;
    }

    @Override
    public String toString()
    {
        return "Blueprint{" +
                "title='" + this.title + '\'' +
                ", author=" + this.author.getDisplayName() +
                ", key='" + this.key + '\'' +
                '}';
    }

    public void addTag(String tag)
    {
        this.tags.add(tag);
    }
}
