package com.example.localjobportal;

import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.localjobportal.adapters.JobAdapter;
import com.example.localjobportal.models.Job;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

import java.util.ArrayList;
import java.util.List;

public class SearchActivity extends AppCompatActivity {
    private EditText searchInput;
    private EditText locationFilterInput;
    private EditText skillFilterInput;
    private EditText industryFilterInput;

    private Button applyFilterButton;
    private RecyclerView searchResultsRecyclerView;
    private JobAdapter jobAdapter;
    private List<Job> jobList; // List to hold job postings
    private DatabaseReference databaseReference; // Firebase database reference

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_search);

        // Initialize Firebase Database reference
        databaseReference = FirebaseDatabase.getInstance().getReference("jobs");

        searchInput = findViewById(R.id.search_input);
        locationFilterInput = findViewById(R.id.location_filter);
        skillFilterInput = findViewById(R.id.skill_filter);
        industryFilterInput = findViewById(R.id.industry_filter);

        applyFilterButton = findViewById(R.id.btn_apply_filter);
        searchResultsRecyclerView = findViewById(R.id.search_results_recycler_view);
        searchResultsRecyclerView.setLayoutManager(new LinearLayoutManager(this));

        jobList = new ArrayList<>();
        jobAdapter = new JobAdapter(this, jobList);
        searchResultsRecyclerView.setAdapter(jobAdapter);

        applyFilterButton.setOnClickListener(view -> searchJobs());

        // Load all jobs on creation, so all jobs are available if no filters are applied.
        loadAllJobs();
    }

    private void loadAllJobs() {
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
                Toast.makeText(SearchActivity.this, "Failed to load jobs.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void searchJobs() {
        String searchText = searchInput.getText().toString().trim();
        String locationFilter = locationFilterInput.getText().toString().trim();
        String skillFilter = skillFilterInput.getText().toString().trim();
        String industryFilter = industryFilterInput.getText().toString().trim();

        // Filter jobs based on the input criteria
        List<Job> filteredJobs = new ArrayList<>();
        for (Job job : jobList) {
            boolean matches = true;

            if (!TextUtils.isEmpty(searchText) && !job.getTitle().toLowerCase().contains(searchText.toLowerCase())) {
                matches = false;
            }
            if (!TextUtils.isEmpty(locationFilter) && !job.getLocation().toLowerCase().contains(locationFilter.toLowerCase())) {
                matches = false;
            }
            if (!TextUtils.isEmpty(skillFilter) && !job.getSkillLevel().toLowerCase().contains(skillFilter.toLowerCase())) {
                matches = false;
            }
            if (!TextUtils.isEmpty(industryFilter) && !job.getIndustry().toLowerCase().contains(industryFilter.toLowerCase())) {
                matches = false;
            }

            if (matches) {
                filteredJobs.add(job);
            }
        }

        // Update the adapter with filtered jobs
        jobAdapter = new JobAdapter(this, filteredJobs);
        searchResultsRecyclerView.setAdapter(jobAdapter);
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadAllJobs(); // Refresh the job list when activity resumes.
    }
}