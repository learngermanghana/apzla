import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

export function useAuthProfile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        setProfileLoading(true);
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
          setUserProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, userProfile, setUserProfile, profileLoading };
}
