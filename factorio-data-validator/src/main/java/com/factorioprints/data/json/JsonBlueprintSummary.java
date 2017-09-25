package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.time.Instant;

@JsonPropertyOrder(alphabetic = true)
public class JsonBlueprintSummary
{
    private final String title;
    private final String imgurId;
    private final String imgurType;
    private final int numberOfFavorites;
    private final Instant lastUpdatedDate;

    public JsonBlueprintSummary(
            String title,
            String imgurId,
            String imgurType,
            int numberOfFavorites,
            Instant lastUpdatedDate)
    {
        this.imgurId = imgurId;
        this.imgurType = imgurType;
        this.numberOfFavorites = numberOfFavorites;
        this.title = title;
        this.lastUpdatedDate = lastUpdatedDate;
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
