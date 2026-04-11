package com.example.localjobportal.models;

public class Job {
    private String id;
    private String title;
    private String description;
    private String location;
    private String skillLevel;
    private String industry;
    private String userId; // To track who posted the job

    public Job() {
        // Default constructor required for calls to DataSnapshot.getValue(Job.class)
    }

    public Job(String id, String title, String description, String location, String skillLevel, String industry, String userId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.location = location;
        this.skillLevel = skillLevel;
        this.industry = industry;
        this.userId = userId;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getSkillLevel() {
        return skillLevel;
    }

    public void setSkillLevel(String skillLevel) {
        this.skillLevel = skillLevel;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}