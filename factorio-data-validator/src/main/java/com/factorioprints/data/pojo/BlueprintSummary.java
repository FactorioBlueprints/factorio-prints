package com.factorioprints.data.pojo;

import com.factorioprints.data.json.BlueprintKey;

import java.time.Instant;

public class BlueprintSummary
{
    private final BlueprintKey blueprintKey;
    private final String title;
    private final String imgurId;
    private final String imgurType;
    private final int numberOfFavorites;
    private final Instant lastUpdatedDate;

    public BlueprintSummary(
            BlueprintKey blueprintKey,
            String title,
            String imgurId,
            String imgurType,
            int numberOfFavorites,
            Instant lastUpdatedDate)
    {
        this.blueprintKey = blueprintKey;
        this.title = title;
        this.imgurId = imgurId;
        this.imgurType = imgurType;
        this.numberOfFavorites = numberOfFavorites;
        this.lastUpdatedDate = lastUpdatedDate;
    }

    public BlueprintKey getBlueprintKey()
    {
        return this.blueprintKey;
    }

    public String getTitle()
    {
        return this.title;
    }

    public String getImgurId()
    {
        return this.imgurId;
    }

    public String getImgurType()
    {
        return this.imgurType;
    }

    public int getNumberOfFavorites()
    {
        return this.numberOfFavorites;
    }

    public Instant getLastUpdatedDate()
    {
        return this.lastUpdatedDate;
    }
}
