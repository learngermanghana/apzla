import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

export function useAuthProfile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const loadProfile = async (firebaseUser) => {
    if (!firebaseUser) return;

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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfileError("You are not signed in. Please log in again.");
      setProfileLoading(false);
      return;
    }

    loadProfile(currentUser);
  };

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    await currentUser.reload();
    // Clone the user object to trigger React updates
    const updatedUser = { ...currentUser };
    setUser(updatedUser);
    return updatedUser;
  };

  useEffect(() => {
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
