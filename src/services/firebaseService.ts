import { collection, doc, setDoc, getDocs, query, where, Timestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface Employee {
  id: string;
  name: string;
  nominaNumber: string;
  schedule: string;
  location: string;
  fechaIngreso?: string;
  rfc?: string;
  userId: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  nominaNumber: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  location?: { latitude: number; longitude: number } | null;
  locationDescription: string;
  delegacion?: string;
  photo?: string | null;
  userId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveCompanySettings = async (settings: any) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/settings/company`;
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'company'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const saveCustomizationSettings = async (settings: any) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/settings/customization`;
  try {
    await setDoc(doc(db, 'users', userId, 'settings', 'customization'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getCustomizationSettings = async (): Promise<any> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;

  const path = `users/${userId}/settings/customization`;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'customization');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getCompanySettings = async (adminId?: string): Promise<any> => {
  const userId = adminId || auth.currentUser?.uid;
  if (!userId) return null;

  const path = `users/${userId}/settings/company`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'settings', 'company'));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};
export const saveAttendanceRecord = async (record: AttendanceRecord, adminId?: string) => {
  const userId = adminId || auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/records/${record.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'records', record.id), {
      ...record,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const saveEmployee = async (employee: Employee) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/employees/${employee.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'employees', employee.id), {
      ...employee,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getEmployees = async (adminId?: string): Promise<Employee[]> => {
  const userId = adminId || auth.currentUser?.uid;
  if (!userId) return [];

  const path = `users/${userId}/employees`;
  try {
    const q = query(collection(db, 'users', userId, 'employees'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Employee);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = `users/${userId}/records`;
  try {
    const q = query(collection(db, 'users', userId, 'records'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AttendanceRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const deleteEmployee = async (employeeId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/employees/${employeeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'employees', employeeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteAttendanceRecord = async (recordId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = `users/${userId}/records/${recordId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'records', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const resetDatabase = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  try {
    const employeesRef = collection(db, 'users', userId, 'employees');
    const employeesSnapshot = await getDocs(employeesRef);
    const employeeDeletions = employeesSnapshot.docs.map(doc => deleteDoc(doc.ref));

    const recordsRef = collection(db, 'users', userId, 'records');
    const recordsSnapshot = await getDocs(recordsRef);
    const recordDeletions = recordsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    await Promise.all([...employeeDeletions, ...recordDeletions]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/reset`);
  }
};
