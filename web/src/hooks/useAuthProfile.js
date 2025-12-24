import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db, firebaseConfigError, isFirebaseConfigured } from "../firebase";

export function useAuthProfile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const profileUnsubscribeRef = useRef(null);

  const clearProfileSubscription = useCallback(() => {
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
  }, []);

  const subscribeToProfile = useCallback(
    (firebaseUser) => {
      if (!firebaseUser) return;

      clearProfileSubscription();
      setProfileLoading(true);
      setProfileError("");

      const profileRef = doc(db, "users", firebaseUser.uid);
      profileUnsubscribeRef.current = onSnapshot(
        profileRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile({ id: snapshot.id, ...snapshot.data() });
          } else {
            setUserProfile(null);
          }
          setProfileLoading(false);
        },
        (error) => {
          console.error("Profile load error:", error);
          setProfileError(error.message || "Unable to load your profile.");
          setUserProfile(null);
          setProfileLoading(false);
        }
      );
    },
    [clearProfileSubscription]
  );

  const reloadProfile = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfileError("You are not signed in. Please log in again.");
      setProfileLoading(false);
      return;
    }

    subscribeToProfile(currentUser);
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
    if (isFirebaseConfigured === false) {
      setProfileError(
        firebaseConfigError ||
          "Firebase is not configured. Please set the required environment variables to continue."
      );
      setProfileLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        subscribeToProfile(firebaseUser);
      } else {
        clearProfileSubscription();
        setProfileError("");
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      clearProfileSubscription();
      unsubscribe();
    };
  }, [clearProfileSubscription, subscribeToProfile]);

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
