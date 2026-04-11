package com.example.localjobportal;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.localjobportal.adapters.JobAdapter;
import com.example.localjobportal.models.Job;
import com.example.localjobportal.utils.SharedPrefManager;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    private RecyclerView jobRecyclerView;
    private JobAdapter jobAdapter;
    private List<Job> jobList;
    private Button postJobButton, cvBuilderButton, searchButton, logoutButton;
    private SharedPrefManager prefManager;
    private DatabaseReference databaseReference;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        prefManager = new SharedPrefManager(this);

        if (!prefManager.isLoggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        // Initialize Firebase Database reference
        databaseReference = FirebaseDatabase.getInstance().getReference("jobs");

        jobRecyclerView = findViewById(R.id.job_recycler_view);
        jobRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        jobList = new ArrayList<>();
        jobAdapter = new JobAdapter(this, jobList);
        jobRecyclerView.setAdapter(jobAdapter);

        loadJobs();

        postJobButton = findViewById(R.id.btn_post_job);
        cvBuilderButton = findViewById(R.id.btn_cv_builder);
        searchButton = findViewById(R.id.btn_search);
        logoutButton = findViewById(R.id.btn_logout);

        postJobButton.setOnClickListener(view -> {
            startActivity(new Intent(MainActivity.this, JobPostingActivity.class));
        });

        cvBuilderButton.setOnClickListener(view -> {
            startActivity(new Intent(MainActivity.this, CVBuilderActivity.class));
        });

        searchButton.setOnClickListener(view -> {
            startActivity(new Intent(MainActivity.this, SearchActivity.class));
        });

        logoutButton.setOnClickListener(view -> {
            prefManager.logout();
            startActivity(new Intent(MainActivity.this, LoginActivity.class));
            finish();
        });
    }

    private void loadJobs() {
        databaseReference.addValueEventListener(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot dataSnapshot) {
                jobList.clear();
                for (DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    Job job = snapshot.getValue(Job.class);
                    jobList.add(job);
                }
                jobAdapter.notifyDataSetChanged();
            }

            @Override
            public void onCancelled(@NonNull DatabaseError databaseError) {
                Toast.makeText(MainActivity.this, "Failed to load jobs.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadJobs(); // Refresh the jobs list when activity resumes.
    }
}