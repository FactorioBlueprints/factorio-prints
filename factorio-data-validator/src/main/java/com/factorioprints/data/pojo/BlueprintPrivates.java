package com.factorioprints.data.pojo;

public class BlueprintPrivates
{
    private final String fileName;
    private final String imageUrl;
    private final String thumbnail;
    private final String deletehash;

    public BlueprintPrivates(String fileName, String imageUrl, String thumbnail, String deletehash)
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

    @Override
    public boolean equals(Object o)
    {
        if (this == o)
        {
            return true;
        }
        if (o == null || this.getClass() != o.getClass())
        {
            return false;
        }

        BlueprintPrivates that = (BlueprintPrivates) o;

        if (!this.fileName.equals(that.fileName))
        {
            return false;
        }
        if (!this.imageUrl.equals(that.imageUrl))
        {
            return false;
        }
        if (!this.thumbnail.equals(that.thumbnail))
        {
            return false;
        }
        return this.deletehash.equals(that.deletehash);
    }

    @Override
    public int hashCode()
    {
        int result = this.fileName.hashCode();
        result = 31 * result + this.imageUrl.hashCode();
        result = 31 * result + this.thumbnail.hashCode();
        result = 31 * result + this.deletehash.hashCode();
        return result;
    }
}
