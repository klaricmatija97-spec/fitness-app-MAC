import { z } from "zod";
import {
  activityOptions,
  ageOptions,
  goalOptions,
  heightUnits,
  honorificOptions,
  weightUnits,
  trainingFrequencyOptions,
  trainingDurationOptions,
  trainingLocationOptions,
  equipmentOptions,
  experienceLevelOptions,
  mealFrequencyOptions,
  dietTypeOptions,
  biggestChallengeOptions,
} from "./intake-options";

const honorificEnum = z.enum(honorificOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const ageEnum = z.enum(ageOptions.map((o) => o.value) as [string, ...string[]]);
const activityEnum = z.enum(activityOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const goalEnum = z.enum(goalOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const weightUnitEnum = z.enum(weightUnits.map((o) => o.value) as [
  string,
  ...string[],
]);
const heightUnitEnum = z.enum(heightUnits.map((o) => o.value) as [
  string,
  ...string[],
]);
const trainingFrequencyEnum = z.enum(trainingFrequencyOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const trainingDurationEnum = z.enum(trainingDurationOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const trainingLocationEnum = z.enum(trainingLocationOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const equipmentEnum = z.enum(equipmentOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const experienceLevelEnum = z.enum(experienceLevelOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const mealFrequencyEnum = z.enum(mealFrequencyOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const dietTypeEnum = z.enum(dietTypeOptions.map((o) => o.value) as [
  string,
  ...string[],
]);
const biggestChallengeEnum = z.enum(biggestChallengeOptions.map((o) => o.value) as [
  string,
  ...string[],
]);

export const intakeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  honorific: honorificEnum,
  ageRange: ageEnum,
  weight: z.object({
    value: z.number().positive(),
    unit: weightUnitEnum,
  }),
  height: z.object({
    value: z.number().positive(),
    unit: heightUnitEnum,
  }),
  activities: z.array(activityEnum).min(1),
  goals: z.array(goalEnum).min(1),
  dietCleanliness: z.number().min(0).max(100),
  otherActivities: z.string().optional(),
  otherGoals: z.string().optional(),
  notes: z.string().optional(),
  // Nova polja
  trainingFrequency: trainingFrequencyEnum.optional(),
  trainingDuration: trainingDurationEnum.optional(),
  trainingLocation: trainingLocationEnum.optional(),
  equipment: z.array(equipmentEnum).optional(),
  experience: experienceLevelEnum.optional(),
  mealFrequency: mealFrequencyEnum.optional(),
  allergies: z.string().optional(),
  dietType: dietTypeEnum.optional(),
  otherDietType: z.string().optional(),
  sleepHours: z.number().min(4).max(10).optional(),
  injuries: z.string().optional(),
  biggestChallenge: biggestChallengeEnum.optional(),
  otherChallenge: z.string().optional(),
});

export type IntakePayload = z.infer<typeof intakeSchema>;

