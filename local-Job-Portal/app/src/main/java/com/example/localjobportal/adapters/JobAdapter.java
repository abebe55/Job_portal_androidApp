package com.example.localjobportal.adapters;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.localjobportal.R;
import com.example.localjobportal.models.Job;

import java.util.List;

public class JobAdapter extends RecyclerView.Adapter<JobAdapter.JobViewHolder> {
    private Context context; // Added context to handle context-related operations
    private List<Job> jobList;

    public JobAdapter(Context context, List<Job> jobList) {
        this.context = context; // Initialize context
        this.jobList = jobList;
    }

    @NonNull
    @Override
    public JobViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_job, parent, false);
        return new JobViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull JobViewHolder holder, int position) {
        Job job = jobList.get(position);
        holder.jobTitle.setText(job.getTitle());
        holder.jobDescription.setText(job.getDescription());
        holder.jobLocation.setText(job.getLocation());
        holder.jobSkillLevel.setText(job.getSkillLevel());
        holder.jobIndustry.setText(job.getIndustry());
    }

    @Override
    public int getItemCount() {
        return jobList.size();
    }

    public static class JobViewHolder extends RecyclerView.ViewHolder {
        TextView jobTitle, jobDescription, jobLocation, jobSkillLevel, jobIndustry;

        public JobViewHolder(@NonNull View itemView) {
            super(itemView);
            jobTitle = itemView.findViewById(R.id.job_title_text_view);
            jobDescription = itemView.findViewById(R.id.job_description_text_view);
            jobLocation = itemView.findViewById(R.id.job_location_text_view);
            jobSkillLevel = itemView.findViewById(R.id.job_skill_level_text_view);
            jobIndustry = itemView.findViewById(R.id.job_industry_text_view);
        }
    }
}