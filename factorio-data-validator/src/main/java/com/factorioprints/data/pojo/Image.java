package com.factorioprints.data.pojo;

public class Image
{
    private final String id;
    private final String type;
    private final String deletehash;
    private final int height;
    private final int width;

    public Image(String id, String type, String deletehash, int height, int width)
    {
        this.id = id;
        this.type = type;
        this.deletehash = deletehash;
        this.height = height;
        this.width = width;
    }

    public String getId()
    {
        return this.id;
    }

    public String getType()
    {
        return this.type;
    }

    public String getDeletehash()
    {
        return this.deletehash;
    }

    public int getHeight()
    {
        return this.height;
    }

    public int getWidth()
    {
        return this.width;
    }
}
