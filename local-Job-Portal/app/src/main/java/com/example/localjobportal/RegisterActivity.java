package com.example.localjobportal;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.localjobportal.R;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser ;

public class RegisterActivity extends AppCompatActivity {

    private EditText emailInput, passwordInput;
    private Button registerButton;
    private FirebaseAuth auth; // Firebase Authentication instance

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        // Initialize Firebase Auth
        auth = FirebaseAuth.getInstance();

        emailInput = findViewById(R.id.register_email);
        passwordInput = findViewById(R.id.register_password);
        registerButton = findViewById(R.id.btn_register);

        registerButton.setOnClickListener(v -> {
            String email = emailInput.getText().toString().trim();
            String password = passwordInput.getText().toString().trim();

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(RegisterActivity.this, "Please fill all fields.", Toast.LENGTH_SHORT).show();
            } else {
                registerUser (email, password);
            }
        });
    }

    private void registerUser (String email, String password) {
        // Correct method name: createUser WithEmailAndPassword
        auth.createUserWithEmailAndPassword(email, password).addOnCompleteListener(this, task -> {
            if (task.isSuccessful()) {
                // Registration successful
                FirebaseUser  user = auth.getCurrentUser ();
                Toast.makeText(RegisterActivity.this, "User  registered successfully", Toast.LENGTH_SHORT).show();
                finish(); // Return to the previous activity
            } else {
                // If registration fails, display a message to the user.
                Toast.makeText(RegisterActivity.this, "Registration failed: " + task.getException().getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}