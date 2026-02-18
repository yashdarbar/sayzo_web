import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, initializeRecaptchaConfig } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { TASK_STATUS, APPLICATION_STATUS } from "./constants";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth instance
export const auth = getAuth(app);

// Disable App Check for phone auth (helps with reCAPTCHA Enterprise issues)
auth.settings.appVerificationDisabledForTesting = false;

// Firestore instance - connect to "users" database (not default)
export const db = getFirestore(app, "users");

// Clear existing reCAPTCHA verifier
export const clearRecaptcha = () => {
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.log("reCAPTCHA clear error (ignored):", e);
    }
    window.recaptchaVerifier = null;
  }
};

// Setup reCAPTCHA verifier for phone auth
export const setupRecaptcha = (containerId, useVisible = false) => {
  if (typeof window === "undefined") return null;

  // Check if container exists
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`reCAPTCHA container #${containerId} not found!`);
    return null;
  }

  // Always clear existing verifier first
  clearRecaptcha();

  console.log("Setting up reCAPTCHA verifier...", useVisible ? "(visible)" : "(invisible)");

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: useVisible ? "normal" : "invisible",
    callback: (response) => {
      console.log("reCAPTCHA solved:", response);
    },
    "expired-callback": () => {
      console.log("reCAPTCHA expired");
      clearRecaptcha();
    },
  });

  return window.recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    console.log("=== sendOTP Debug ===");
    console.log("Phone:", phoneNumber);
    console.log("Auth instance:", auth);
    console.log("Auth app:", auth.app?.name);

    const recaptchaVerifier = setupRecaptcha("recaptcha-container");

    if (!recaptchaVerifier) {
      throw new Error("Failed to setup reCAPTCHA verifier");
    }

    const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
    console.log("Formatted phone:", formattedPhone);

    // Render reCAPTCHA first
    console.log("Rendering reCAPTCHA...");
    await recaptchaVerifier.render();
    console.log("reCAPTCHA rendered");

    console.log("Calling signInWithPhoneNumber...");
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log("OTP sent successfully");

    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (error) {
    console.error("=== sendOTP Error ===");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    // Clear reCAPTCHA on error so it can be recreated on retry
    clearRecaptcha();
    throw error;
  }
};

// Verify OTP
export const verifyOTP = async (otp) => {
  if (!window.confirmationResult) {
    throw new Error("Please send OTP first");
  }
  const result = await window.confirmationResult.confirm(otp);
  return result.user;
};

// Add task to Firestore
export const addTask = async (taskData) => {
  // Debug: Check auth state before writing
  const currentUser = auth.currentUser;
  console.log("=== Firestore Debug ===");
  console.log("Auth currentUser:", currentUser);
  console.log("Auth UID:", currentUser?.uid);

  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  // Get fresh token to ensure auth is synced with Firestore
  const token = await currentUser.getIdToken(true);
  console.log("Auth token obtained:", token ? "Yes" : "No");

  const tasksRef = collection(db, "tasks");
  const docRef = await addDoc(tasksRef, {
    ...taskData,
    createdAt: serverTimestamp(),
    status: TASK_STATUS.PENDING_APPROVAL,
  });
  return docRef.id;
};

// Get all tasks from Firestore
export const getTasks = async () => {
  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get tasks by giver (for task giver's dashboard)
export const getTasksByGiver = async (giverId) => {
  const tasksRef = collection(db, "tasks");
  const q = query(
    tasksRef,
    where("giverId", "==", giverId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get approved tasks (for browse page - visible to task doers)
export const getApprovedTasks = async () => {
  const tasksRef = collection(db, "tasks");
  const q = query(
    tasksRef,
    where("status", "in", [TASK_STATUS.APPROVED, TASK_STATUS.ACTIVE]),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get pending tasks (for admin review)
export const getPendingTasks = async () => {
  const tasksRef = collection(db, "tasks");
  const q = query(
    tasksRef,
    where("status", "==", TASK_STATUS.PENDING_APPROVAL),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get tasks by status (for admin filtering)
export const getTasksByStatus = async (status) => {
  const tasksRef = collection(db, "tasks");
  const q = query(
    tasksRef,
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get single task by ID
export const getTaskById = async (taskId) => {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);

  if (taskSnap.exists()) {
    return { id: taskSnap.id, ...taskSnap.data() };
  }
  return null;
};

// Update task status (for admin approve/reject)
export const updateTaskStatus = async (taskId, status, rejectionReason = null) => {
  const taskRef = doc(db, "tasks", taskId);
  const updateData = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === TASK_STATUS.APPROVED) {
    updateData.approvedAt = serverTimestamp();
  }

  if (status === TASK_STATUS.REJECTED && rejectionReason) {
    updateData.adminRejectionReason = rejectionReason;
  }

  await updateDoc(taskRef, updateData);
};

// Delete task (admin only)
export const deleteTask = async (taskId) => {
  const taskRef = doc(db, "tasks", taskId);
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(taskRef);
};

// ============ APPLICATIONS ============

// Add application (task doer applies for a task)
export const addApplication = async (applicationData) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  const applicationsRef = collection(db, "applications");
  const docRef = await addDoc(applicationsRef, {
    ...applicationData,
    applicantId: currentUser.uid,
    applicantPhone: currentUser.phoneNumber,
    status: APPLICATION_STATUS.PENDING,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Get applications for a specific task (for task giver)
export const getApplicationsByTask = async (taskId) => {
  const applicationsRef = collection(db, "applications");
  const q = query(
    applicationsRef,
    where("taskId", "==", taskId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get applications by applicant (for task doer's dashboard)
export const getApplicationsByApplicant = async (applicantId) => {
  const applicationsRef = collection(db, "applications");
  const q = query(
    applicationsRef,
    where("applicantId", "==", applicantId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Update application status (task giver accepts/rejects)
export const updateApplicationStatus = async (applicationId, status) => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  // Get fresh token to ensure auth is synced with Firestore
  await currentUser.getIdToken(true);

  const applicationRef = doc(db, "applications", applicationId);
  await updateDoc(applicationRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

// Check if user has already applied to a task
export const hasUserApplied = async (taskId, userId) => {
  const applicationsRef = collection(db, "applications");
  const q = query(
    applicationsRef,
    where("taskId", "==", taskId),
    where("applicantId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};
