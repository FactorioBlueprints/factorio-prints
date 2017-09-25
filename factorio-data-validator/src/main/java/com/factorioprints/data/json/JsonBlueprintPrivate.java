package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder(alphabetic = true)
public class JsonBlueprintPrivate
{
    private final String fileName;
    private final String imageUrl;
    private final String thumbnail;
    private final String deletehash;

    public JsonBlueprintPrivate(String fileName, String imageUrl, String thumbnail, String deletehash)
    {
        this.fileName = fileName;
        this.imageUrl = imageUrl;
        this.thumbnail = thumbnail;
        this.deletehash = deletehash;
    }

    public String getFileName()
    {
        return this.fileName;
    }

    public String getImageUrl()
    {
        return this.imageUrl;
    }

    public String getThumbnail()
    {
        return this.thumbnail;
    }

    public String getDeletehash()
    {
        return this.deletehash;
    }
}
