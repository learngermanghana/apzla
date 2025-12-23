import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db, firebaseConfigError, isFirebaseConfigured } from "../firebase";

export function useAuthProfile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const loadProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setProfileError("You are not signed in. Please log in again.");
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    if (!db) {
      setProfileError(
        "Firebase is not initialized. Please check the environment configuration."
      );
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    try {
      const profileRef = doc(db, "users", firebaseUser.uid);
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        setUserProfile({ id: snapshot.id, ...snapshot.data() });
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Profile load error:", error);
      setProfileError(error.message || "Unable to load your profile.");
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const reloadProfile = () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setProfileError("You are not signed in. Please log in again.");
      setProfileLoading(false);
      return;
    }

    loadProfile(currentUser);
  };

  const refreshUser = async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;

    await currentUser.reload();
    // Clone the user object to trigger React updates
    const updatedUser = { ...currentUser };
    setUser(updatedUser);
    return updatedUser;
  };

  useEffect(() => {
    if (isFirebaseConfigured === false) {
      setProfileError(
        firebaseConfigError ||
          "Firebase is not configured. Please set the required environment variables to continue."
      );
      setProfileLoading(false);
      return () => {};
    }

    if (!auth || !db) {
      setProfileError(
        "Unable to initialize Firebase. Please refresh and ensure your configuration is valid."
      );
      setProfileLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        loadProfile(firebaseUser);
      } else {
        setProfileError("");
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userProfile,
    setUserProfile,
    profileLoading,
    profileError,
    reloadProfile,
    refreshUser,
  };
}
