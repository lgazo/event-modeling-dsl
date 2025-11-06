
export const console_log = {
    debug: (message: string, params?: any) => {
        // if (params) {
        //     console.log(`[DEBUG] ${message}`, params);
        // } else {
        //     console.log(`[DEBUG] ${message}`);
        // }
    },

    info: (message: string, params?: any) => {
        if (params) {
            console.log(`[INFO] ${message}`, params);
        } else {
            console.log(`[INFO] ${message}`);
        }
    },

    log: (message: string, params?: any) => {
        if (params) {
            console.log(`[LOG] ${message}`, params);
        } else {
            console.log(`[LOG] ${message}`);
        }
    }
}