package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonValue;

public class BlueprintKey implements Comparable<BlueprintKey>
{
    @JsonValue
    private final String value;

    public BlueprintKey(String value)
    {
        this.value = value;
    }

    @Override
    public String toString()
    {
        return this.value;
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

        BlueprintKey that = (BlueprintKey) o;

        return this.value.equals(that.value);
    }

    @Override
    public int hashCode()
    {
        return this.value.hashCode();
    }

    @Override
    public int compareTo(BlueprintKey other)
    {
        return this.value.compareTo(other.value);
    }
}
