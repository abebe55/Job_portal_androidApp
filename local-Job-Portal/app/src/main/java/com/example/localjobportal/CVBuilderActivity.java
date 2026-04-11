package com.example.localjobportal;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.localjobportal.models.CVData;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

public class CVBuilderActivity extends AppCompatActivity {

    private EditText name, email, phone, skills, education, experience;
    private Button btnSaveCV;
    private DatabaseReference databaseReference; // Firebase database reference

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cvbuilder);

        // Initialize Firebase Database reference
        databaseReference = FirebaseDatabase.getInstance().getReference("cv_data");

        name = findViewById(R.id.name);
        email = findViewById(R.id.email);
        phone = findViewById(R.id.phone);
        skills = findViewById(R.id.skills);
        education = findViewById(R.id.education);
        experience = findViewById(R.id.experience);
        btnSaveCV = findViewById(R.id.btn_save_cv);

        btnSaveCV.setOnClickListener(v -> {
            String nameText = name.getText().toString().trim();
            String emailText = email.getText().toString().trim();
            String phoneText = phone.getText().toString().trim();
            String skillsText = skills.getText().toString().trim();
            String educationText = education.getText().toString().trim();
            String experienceText = experience.getText().toString().trim();

            if (nameText.isEmpty() || emailText.isEmpty() || phoneText.isEmpty() || skillsText.isEmpty() || educationText.isEmpty() || experienceText.isEmpty()) {
                Toast.makeText(CVBuilderActivity.this, "Please fill all the fields.", Toast.LENGTH_SHORT).show();
            } else {
                String cvId = databaseReference.push().getKey(); // Generate a unique ID for the CV
                if (cvId != null) {
                    CVData cvData = new CVData(cvId, nameText, emailText, phoneText, skillsText, educationText, experienceText);
                    databaseReference.child(cvId).setValue(cvData)
                            .addOnSuccessListener(aVoid -> {
                                Toast.makeText(CVBuilderActivity.this, "CV Saved!", Toast.LENGTH_SHORT).show();
                                finish(); // Return to main activity
                            })
                            .addOnFailureListener(e -> {
                                Toast.makeText(CVBuilderActivity.this, "Failed to save CV.", Toast.LENGTH_SHORT).show();
                            });
                }
            }
        });
    }
}