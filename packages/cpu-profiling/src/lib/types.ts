import {CPUProfile} from "./cpuprofile.types";

/**
 * Container object maintaining V8 CPUProfile as well as metadata.
 */
export interface CpuProfileInfo {
    pid: number;
    tid: number;
    cpuProfile: CPUProfile;
    sequence?: number;
    startDate?: Date;
    sourceFilePath?: string;
    execArgs?: string[];
}
