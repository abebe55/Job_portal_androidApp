package com.example.localjobportal.models;

// 9. java/com/example/localjobportal/models/CVData.java

public class CVData {
    private String id; // Changed to String to hold Firebase key
    private String name;
    private String email;
    private String phone;
    private String skills;
    private String education;
    private String experience;

    // Default constructor required for calls to DataSnapshot.getValue(CVData.class)
    public CVData() {
    }

    // Constructor without ID
    public CVData(String name, String email, String phone, String skills, String education, String experience) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.skills = skills;
        this.education = education;
        this.experience = experience;
    }

    // Constructor with ID
    public CVData(String id, String name, String email, String phone, String skills, String education, String experience) {
        this.id = id; // Initialize id
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.skills = skills;
        this.education = education;
        this.experience = experience;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getExperience() {
        return experience;
    }

    public void setExperience(String experience) {
        this.experience = experience;
    }
}