package com.example.localjobportal;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.localjobportal.R;
import com.example.localjobportal.models.Job;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

public class JobPostingActivity extends AppCompatActivity {

    private EditText jobTitle, jobDescription, jobLocation, jobSkillLevel, jobIndustry;
    private Button btnPost;
    private DatabaseReference databaseReference;
    private FirebaseAuth auth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_job_posting);

        databaseReference = FirebaseDatabase.getInstance().getReference("jobs");
        auth = FirebaseAuth.getInstance();

        jobTitle = findViewById(R.id.job_title);
        jobDescription = findViewById(R.id.job_description);
        jobLocation = findViewById(R.id.job_location);
        jobSkillLevel = findViewById(R.id.job_skill_level);
        jobIndustry = findViewById(R.id.job_industry);
        btnPost = findViewById(R.id.btn_post);

        btnPost.setOnClickListener(v -> postJob());
    }

    private void postJob() {
        String title = jobTitle.getText().toString().trim();
        String description = jobDescription.getText().toString().trim();
        String location = jobLocation.getText().toString().trim();
        String skillLevel = jobSkillLevel.getText().toString().trim();
        String industry = jobIndustry.getText().toString().trim();
        String userId = auth.getCurrentUser().getUid(); // Get current user ID

        if (!title.isEmpty() && !description.isEmpty() && !location.isEmpty() && !skillLevel.isEmpty() && !industry.isEmpty()) {
            String jobId = databaseReference.push().getKey(); // Generate unique ID for the job
            Job job = new Job(jobId, title, description, location, skillLevel, industry, userId);
            databaseReference.child(jobId).setValue(job)
                    .addOnSuccessListener(aVoid -> {
                        Toast.makeText(JobPostingActivity.this, "Job posted successfully!", Toast.LENGTH_SHORT).show();
                        finish(); // Go back to the main activity after posting
                    })
                    .addOnFailureListener(e -> Toast.makeText(JobPostingActivity.this, "Failed to post job.", Toast.LENGTH_SHORT).show());
        } else {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
        }
    }
}