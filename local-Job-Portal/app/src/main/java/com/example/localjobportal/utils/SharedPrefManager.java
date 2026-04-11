package com.example.localjobportal.utils;
// 11. java/com/example/localjobportal/utils/SharedPrefManager.java

import android.content.Context;
import android.content.SharedPreferences;

public class SharedPrefManager {

    private static final String SHARED_PREF_NAME = "local_job_portal_pref";
    private static final String KEY_IS_LOGGED_IN = "isLoggedIn";
    private SharedPreferences sharedPreferences;
    private SharedPreferences.Editor editor;
    private Context context;

    public SharedPrefManager(Context context) {
        this.context = context;
        sharedPreferences = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE);
        editor = sharedPreferences.edit();
    }

    public void login() {
        editor.putBoolean(KEY_IS_LOGGED_IN, true);
        editor.apply();
    }

    public void logout() {
        editor.putBoolean(KEY_IS_LOGGED_IN, false);
        editor.apply();
    }

    public boolean isLoggedIn() {
        return sharedPreferences.getBoolean(KEY_IS_LOGGED_IN, false);
    }
}