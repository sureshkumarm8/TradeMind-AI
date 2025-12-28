
import { Trade, StrategyProfile, UserProfile, NewsAnalysis } from "../types";

// Types for GAPI
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile openid';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'trademind_backup.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Global Promise handlers
let loginPromiseResolve: ((value: boolean | PromiseLike<boolean>) => void) | null = null;
let loginPromiseReject: ((reason?: any) => void) | null = null;

export interface BackupData {
  trades: Trade[];
  strategy: StrategyProfile;
  preMarketNotes?: { date: string, notes: string };
  // Extended State Persistence
  preMarketAnalysis?: { date: string, timestamp?: string, data: any };
  
  // Updated Live Analysis to support History
  liveMarketAnalysis?: { 
      date: string, 
      timestamp?: string, // Legacy field
      data?: any, // Legacy field
      history?: { timestamp: string, data: any }[] // New History Array
  };
  
  postMarketAnalysis?: { date: string, timestamp?: string, data: any };
  preMarketImages?: any;
  liveMarketImages?: any;
  postMarketImages?: any;
  newsAnalysis?: { date: string, timestamp?: string, data: NewsAnalysis };
  
  lastUpdated: string; // ISO String
}

export const initGoogleDrive = (clientId: string, onInitComplete: (success: boolean) => void) => {
  if (!clientId) {
    onInitComplete(false);
    return;
  }
  
  // Debug Log for Origin
  console.log("Initializing Google Drive Auth with Origin:", window.location.origin);

  // Initialize GAPI
  window.gapi.load('client', async () => {
    try {
      await window.gapi.client.init({
        clientId: clientId,
        discoveryDocs: [DISCOVERY_DOC],
      });
      gapiInited = true;
      checkInit();
    } catch (err) {
      console.error("GAPI Init Error", err);
    }
  });

  // Initialize GIS
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {
            if (resp.error) {
               if (loginPromiseReject) loginPromiseReject(resp);
            } else {
               if (loginPromiseResolve) loginPromiseResolve(true);
            }
            loginPromiseResolve = null;
            loginPromiseReject = null;
        },
        error_callback: (error: any) => {
            // Don't log as error if user closed it, just debug info
            if (error.type === 'popup_closed' || error.type === 'popup_closed_by_user') {
                 console.log("User closed Google Auth popup");
                 if (loginPromiseReject) loginPromiseReject({ type: 'popup_closed' });
            } else {
                 console.error("GIS Error Callback:", error);
                 if (loginPromiseReject) loginPromiseReject(error);
            }
            
            loginPromiseResolve = null;
            loginPromiseReject = null;
        }
    });
    gisInited = true;
    checkInit();
  } catch(err) {
    console.error("GIS Init Error", err);
    onInitComplete(false);
  }

  function checkInit() {
    if (gapiInited && gisInited) {
        onInitComplete(true);
    }
  }
};

export const loginToGoogle = (silent: boolean = false): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google Client not initialized. Please refresh."));
            return;
        }
        loginPromiseResolve = resolve;
        loginPromiseReject = reject;

        // If silent (auto-connect), use empty prompt to avoid account picker if possible
        // Otherwise use 'select_account' to force choice
        tokenClient.requestAccessToken({ prompt: silent ? '' : 'select_account' });
    });
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const response = await window.gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });
        return response.result as UserProfile;
    } catch (err) {
        return null;
    }
};

// Internal helper to find file ID
const findBackupFileId = async (): Promise<string | null> => {
    try {
        // Use a timestamp to prevent caching issues in list requests if any
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name)',
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0].id : null;
    } catch (err) {
        console.error("Error finding file", err);
        return null;
    }
};

/**
 * SMART SYNC:
 * 1. Checks if Cloud File exists.
 * 2. If NO Cloud File -> Creates it with Local Data immediately.
 * 3. If Cloud File EXISTS -> 
 *    - If Local Data is empty? -> Download Cloud Data (Restore).
 *    - If Local Data exists? -> Assume Cloud is "Truth" on login and overwrite local (Sync across devices).
 * 
 * Returns the merged data to update the App state.
 */
export const performInitialSync = async (localTrades: Trade[], localStrategy: StrategyProfile, localPreMarket: any): Promise<{ data: BackupData, fileId: string }> => {
    // Wait a brief moment for auth token to stabilize
    await new Promise(r => setTimeout(r, 500));

    let fileId = await findBackupFileId();
    
    // Construct current local state bundle (Basic Only - full sync happens via saveToDrive later for complex states if needed)
    // Note: For initial creation, we usually just want basic trade data. Complex state sync happens via handleAutoConnect in App.tsx
    const currentLocalData: BackupData = {
        trades: localTrades,
        strategy: localStrategy,
        preMarketNotes: localPreMarket,
        lastUpdated: new Date().toISOString()
    };

    if (!fileId) {
        // Scenario: First time user on ANY device, or user deleted backup.
        // Action: Create new cloud file with current local data.
        console.log("No cloud backup found. Creating new...");
        fileId = await saveToDrive(currentLocalData, null);
        return { data: currentLocalData, fileId };
    } else {
        // Scenario: Cloud file exists.
        console.log("Cloud backup found. Fetching...");
        const cloudData = await loadFromDrive(fileId);
        
        if (!cloudData) {
            // Error reading cloud data, fallback to local
            return { data: currentLocalData, fileId };
        }

        // AUTO-RESTORE LOGIC:
        // On login, we prioritize the Cloud Data to ensure "Sync across devices".
        
        // Edge Case: If Cloud is empty but Local has data (unlikely if file exists), keep local.
        if ((!cloudData.trades || cloudData.trades.length === 0) && localTrades.length > 0) {
             // Push Local to Cloud
             await saveToDrive(currentLocalData, fileId);
             return { data: currentLocalData, fileId };
        }

        return { data: cloudData, fileId };
    }
}

const loadFromDrive = async (fileId: string): Promise<BackupData | null> => {
    try {
        // Use GAPI client to fetch file content
        // We explicitly don't use 'fetch' here to let GAPI handle auth headers more robustly
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        
        // GAPI response.body or response.result depending on environment
        // For 'alt=media', response.body contains the stringified JSON usually
        return response.result as BackupData;
    } catch (err: any) {
        console.error("Error reading file", err);
        if (err.status === 401) {
             // Token likely expired
             throw new Error("Auth Expired");
        }
        return null;
    }
};

// Exported wrapper for Manual Sync
export const loadBackupData = async (fileId: string): Promise<BackupData | null> => {
    // Before loading, ensure token is valid (rudimentary check via GAPI)
    // If expired, loadFromDrive will throw 401, which App.tsx catches.
    return loadFromDrive(fileId);
};

export const saveToDrive = async (data: any, existingFileId?: string | null): Promise<string> => {
    const fileContent = JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString()
    });
    
    const file = new Blob([fileContent], {type: 'application/json'});
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

    const performUpload = async (token: string) => {
        if (existingFileId) {
            // PATCH existing file
            const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: fileContent
            });
            if (res.status === 401) throw new Error("Auth Expired");
            if (!res.ok) throw new Error("Update Failed");
            return existingFileId;
        } else {
            // POST new file
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', file);

            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });
            if (res.status === 401) throw new Error("Auth Expired");
            if (!res.ok) throw new Error("Create Failed");
            const json = await res.json();
            return json.id;
        }
    };

    try {
        const tokenObj = window.gapi.client.getToken();
        if (!tokenObj) throw new Error("Auth Expired");
        
        return await performUpload(tokenObj.access_token);
        
    } catch (err: any) {
        if (err.message === "Auth Expired") {
            console.warn("Token expired. Attempting refresh...");
            // Attempt simple silent refresh if possible, otherwise fail gracefully
            try {
                // We use prompt: '' to try silent refresh if consent exists
                await new Promise((resolve, reject) => {
                    tokenClient.requestAccessToken({ prompt: '', callback: (resp: any) => {
                        if (resp.error) reject(resp);
                        else resolve(resp);
                    }});
                });
                // Retry upload with new token
                const newToken = window.gapi.client.getToken().access_token;
                return await performUpload(newToken);
            } catch (refreshErr) {
                console.error("Refresh failed", refreshErr);
                throw new Error("Auth Expired"); // Propagate to UI to ask user to login
            }
        }
        console.error("Save Error", err);
        throw err;
    }
};
