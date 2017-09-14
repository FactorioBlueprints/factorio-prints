package com.factorioprints.data.json;

import com.fasterxml.jackson.annotation.JsonValue;

public class UserId implements Comparable<UserId>
{
    @JsonValue
    private final String value;

    public UserId(String value)
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

        UserId userId = (UserId) o;

        return this.value.equals(userId.value);
    }

    @Override
    public int hashCode()
    {
        return this.value.hashCode();
    }

    @Override
    public int compareTo(UserId other)
    {
        return this.value.compareTo(other.value);
    }
}
