/* Runs before anything reads saved state (it must stay the first import of main.tsx). */
import { repairStorage } from './store/safe';

repairStorage();
