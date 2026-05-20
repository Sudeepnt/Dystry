export type Counts = {
  businessModels: number;
  strategies: number;
  atomicProcesses: number;
  shortlisted: number;
};

export type Subproblem = {
  id: string;
  name: string;
  created_at: string;
};

export type ResearchSource = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export type BusinessModelType = {
  id: string;
  business_model_id: string;
  name: string;
};

export type BusinessModel = {
  id: string;
  title: string;
  revenue_model: string | null;
  customer_relationship: string | null;
  product_type: string | null;
  scale_profile: string | null;
  stage_sensitivity: string | null;
  notes: string | null;
  created_at: string;
  business_model_types?: BusinessModelType[];
};

export type StrategyBusinessModel = {
  id: string;
  strategy_id: string;
  business_model_id: string;
  business_models?: Pick<BusinessModel, "id" | "title"> | null;
};

export type Strategy = {
  id: string;
  title: string;
  strategy_category: string | null;
  stage: string | null;
  primary_metric: string | null;
  channel_mechanism: string | null;
  evidence_quality: string | null;
  landmark_example: string | null;
  failure_conditions: string | null;
  key_variables: string | null;
  dark_secrets: string | null;
  created_at: string;
  strategy_business_models?: StrategyBusinessModel[];
};

export type AtomicProcessBusinessModel = {
  id: string;
  atomic_process_id: string;
  business_model_id: string;
  business_models?: Pick<BusinessModel, "id" | "title"> | null;
};

export type AtomicProcess = {
  id: string;
  title: string;
  related_strategy_id: string | null;
  pain_frequency: number;
  software_replaceability: number;
  willingness_to_pay: number;
  composability: number;
  total_score: number;
  input_text: string | null;
  action_text: string | null;
  output_text: string | null;
  software_ownable: string | null;
  product_brief: string | null;
  shortlisted: boolean;
  created_at: string;
  strategies?: Pick<Strategy, "id" | "title"> | null;
  atomic_process_business_models?: AtomicProcessBusinessModel[];
};
