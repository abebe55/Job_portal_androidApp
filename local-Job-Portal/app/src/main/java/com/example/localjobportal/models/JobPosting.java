package com.example.localjobportal.models;
// 8. java/com/example/localjobportal/models/JobPosting.java

public class JobPosting {
    private int id;
    private String title;
    private String description;
    private String location;
    private String skillLevel;
    private String industry;

    public JobPosting() {
    }

    public JobPosting(String title, String description, String location, String skillLevel, String industry) {
        this.title = title;
        this.description = description;
        this.location = location;
        this.skillLevel = skillLevel;
        this.industry = industry;
    }
    public int getId() {
        return id;
    }
    public void setId(int id) {
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
}