package com.example.localjobportal.database;

import android.content.Context;
import android.util.Log;

import com.example.localjobportal.models.CVData;
import com.example.localjobportal.models.JobPosting;
import com.example.localjobportal.models.User;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper {

    private static final String TAG = "DatabaseHelper";
    private DatabaseReference jobsRef;
    private DatabaseReference cvRef;
    private DatabaseReference usersRef;

    public DatabaseHelper() {
        // Initialize Firebase Database references
        FirebaseDatabase database = FirebaseDatabase.getInstance();
        jobsRef = database.getReference("jobs");
        cvRef = database.getReference("cv_data");
        usersRef = database.getReference("users");
    }

    // Methods for Job Postings

    public void addJob(JobPosting job) {
        String jobId = jobsRef.push().getKey(); // Generate a unique key for the job
        if (jobId != null) {
            jobsRef.child(jobId).setValue(job)
                    .addOnSuccessListener(aVoid -> Log.d(TAG, "Job added successfully"))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to add job", e));
        }
    }

    public void getAllJobs(final JobDataCallback callback) {
        jobsRef.get().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                List<JobPosting> jobs = new ArrayList<>();
                for (DataSnapshot snapshot : task.getResult().getChildren()) {
                    JobPosting job = snapshot.getValue(JobPosting.class);
                    if (job != null) {
                        jobs.add(job);
                    }
                }
                callback.onCallback(jobs);
            } else {
                Log.e(TAG, "Failed to retrieve jobs", task.getException());
                callback.onCallback(new ArrayList<>()); // Return an empty list on failure
            }
        });
    }

    public void deleteJob(String jobId) {
        jobsRef.child(jobId).removeValue()
                .addOnSuccessListener(aVoid -> Log.d(TAG, "Job deleted successfully"))
                .addOnFailureListener(e -> Log.e(TAG, "Failed to delete job", e));
    }

    // Methods for CV Data

    public void addCVData(CVData cvData) {
        String cvId = cvRef.push().getKey(); // Generate a unique key for the CV
        if (cvId != null) {
            cvRef.child(cvId).setValue(cvData)
                    .addOnSuccessListener(aVoid -> Log.d(TAG, "CV added successfully"))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to add CV", e));
        }
    }

    // User methods
    public void addUser (String email, String password) {
        String userId = usersRef.push().getKey(); // Generate a unique key for the user
        if (userId != null) {
            usersRef.child(userId).setValue(new User(email, password))
                    .addOnSuccessListener(aVoid -> Log.d(TAG, "User  added successfully"))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to add user", e));
        }
    }

    public boolean isUserExist(String email) {
        // Implement user existence check using Firebase
        // This can be done by querying the usersRef for the email
        // Note: Firebase does not support direct queries like SQL, so you may need to retrieve all users and check
        return false; // Placeholder
    }

    public boolean authenticateUser (String email, String password) {
        // Implement user authentication using Firebase
        // This can be done by checking the email and password against stored values
        return false; // Placeholder
    }

    // Callback interface for getting job data
    public interface JobDataCallback {
        void onCallback(List<JobPosting> jobs);
    }
}