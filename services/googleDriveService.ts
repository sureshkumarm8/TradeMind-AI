
import { Trade, StrategyProfile, UserProfile, BackupData } from "../types";

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

export const initGoogleDrive = (clientId: string, onInitComplete: (success: boolean) => void) => {
  if (!clientId) {
    console.warn('❌ No OAuth Client ID provided');
    onInitComplete(false);
    return;
  }
  
  console.log("🔐 Initializing Google OAuth for PWA...");
  console.log("  Client ID:", clientId.substring(0, 12) + '...');

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
      onInitComplete(false);
    }
  });

  // Initialize GIS
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {
            if (resp.error) {
               console.error('❌ OAuth Error:', resp.error, resp.error_description);
               if (loginPromiseReject) loginPromiseReject(resp);
            } else {
               console.log('✅ OAuth Success - User authenticated');
               if (loginPromiseResolve) loginPromiseResolve(true);
            }
            loginPromiseResolve = null;
            loginPromiseReject = null;
        },
        error_callback: (error: any) => {
            console.error("❌ OAuth Error Callback:", error);
            if (loginPromiseReject) loginPromiseReject(error);
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
        console.log("✅ Google Client Initialized.");
        onInitComplete(true);
    }
  }
};

export const loginToGoogle = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google Client not initialized. Please refresh."));
            return;
        }
        loginPromiseResolve = resolve;
        loginPromiseReject = reject;

        // Prompt for consent only if no token, otherwise attempt silent login
        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const response = await window.gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });
        return response.result as UserProfile;
    } catch (err) {
        console.error("Could not fetch user profile", err);
        return null;
    }
};

// Internal helper to find file ID
const findBackupFileId = async (): Promise<string | null> => {
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        const files = response.result.files;
        return (files && files.length > 0) ? files[0].id : null;
    } catch (err) {
        console.error("Error finding file", err);
        return null;
    }
};

/**
 * SMART SYNC v2: MERGE LOGIC
 * This function handles the initial data synchronization when a user logs in.
 * It's designed to prevent data loss by merging local and cloud data.
 */
export const performInitialSync = async (localTrades: Trade[], localStrategy: StrategyProfile, localPreMarket: any): Promise<{ data: BackupData, fileId: string }> => {
    await new Promise(r => setTimeout(r, 500)); // Wait a moment for auth token to stabilize

    let fileId = await findBackupFileId();

    const currentLocalData: BackupData = {
        trades: localTrades || [],
        strategy: localStrategy,
        preMarketNotes: localPreMarket,
        lastUpdated: new Date().toISOString()
    };

    if (!fileId) {
        // SCENARIO: First time sync for this user.
        // ACTION: Upload the current local data to a new cloud file.
        console.log("☁️ No cloud backup found. Creating new one with local data...");
        fileId = await saveToDrive(currentLocalData, null);
        return { data: currentLocalData, fileId };
    } else {
        // SCENARIO: Existing cloud backup found.
        // ACTION: Fetch cloud data and merge it with local data.
        console.log("☁️ Cloud backup found. Fetching and merging...");
        const cloudData = await loadFromDrive(fileId);

        if (!cloudData) {
            // If cloud data is unreadable, we must not overwrite it.
            // We'll proceed with local data for this session to not interrupt the user,
            // but we prevent an upload from happening which could destroy the cloud backup.
            console.warn("Could not load cloud data. Using local data for this session only.");
            return { data: currentLocalData, fileId };
        }

        // --- MERGE LOGIC ---
        
        // 1. Merge Trades: Combine and de-duplicate.
        // This ensures trades created offline are not lost.
        const tradesMap = new Map<string, Trade>();
        (cloudData.trades || []).forEach(trade => tradesMap.set(trade.id, trade));
        (localTrades || []).forEach(trade => tradesMap.set(trade.id, trade)); // Local data overwrites cloud on ID conflict
        const mergedTrades = Array.from(tradesMap.values());

        // 2. Merge Strategy: Prioritize local strategy only if it's been customized.
        const isLocalStrategyDefault = localStrategy.name.includes("(Template)");
        const mergedStrategy = isLocalStrategyDefault ? (cloudData.strategy || localStrategy) : localStrategy;

        // 3. Merge Pre-Market Notes: Prioritize the most recent entry.
        const localDate = localPreMarket ? new Date(localPreMarket.date) : new Date(0);
        const cloudDate = cloudData.preMarketNotes ? new Date(cloudData.preMarketNotes.date) : new Date(0);
        const mergedPreMarket = localDate >= cloudDate ? localPreMarket : cloudData.preMarketNotes;

        const mergedData: BackupData = {
            trades: mergedTrades,
            strategy: mergedStrategy,
            preMarketNotes: mergedPreMarket,
            lastUpdated: new Date().toISOString()
        };

        // Save the newly merged data back to the cloud to complete the two-way sync.
        console.log(`🔄 Merge complete. Cloud: ${cloudData.trades.length}, Local: ${localTrades.length} -> Merged: ${mergedTrades.length}. Saving to cloud.`);
        await saveToDrive(mergedData, fileId);

        return { data: mergedData, fileId };
    }
};

const loadFromDrive = async (fileId: string): Promise<BackupData | null> => {
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        // Handle cases where response might be empty or not valid JSON
        if (typeof response.result === 'object') {
            return response.result as BackupData;
        }
        return null;
    } catch (err) {
        console.error("Error reading file from Drive", err);
        return null;
    }
};

export const saveToDrive = async (data: BackupData, existingFileId?: string | null): Promise<string> => {
    const fileContent = JSON.stringify(data, null, 2); // Pretty-print JSON
    
    const file = new Blob([fileContent], {type: 'application/json'});
    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
    };

    try {
        const accessToken = window.gapi.client.getToken().access_token;
        if (!accessToken) throw new Error("Not authenticated");

        if (existingFileId) {
            // PATCH (Update) existing file
            const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${accessToken}`,'Content-Type': 'application/json' },
                body: fileContent
            });
            if (!res.ok) {
                const errorBody = await res.text();
                throw new Error(`Update failed: ${res.statusText} - ${errorBody}`);
            }
            return existingFileId;
        } else {
            // POST (Create) new file
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', file);

            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });
            if (!res.ok) {
                const errorBody = await res.text();
                throw new Error(`Create failed: ${res.statusText} - ${errorBody}`);
            }
            const json = await res.json();
            return json.id;
        }
    } catch (err) {
        console.error("Save to Drive Error", err);
        throw err;
    }
};
