/** Standard BMI formula: weight in kg over height in meters, squared. */
export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** WHO adult BMI bands. */
export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export const BMI_CATEGORY_LABEL: Record<BmiCategory, string> = {
  underweight: "Underweight",
  normal: "Normal weight",
  overweight: "Overweight",
  obese: "Obese",
};
