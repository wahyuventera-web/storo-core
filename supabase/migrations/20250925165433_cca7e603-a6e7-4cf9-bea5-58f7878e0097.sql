-- Create leads table for capturing leads from multiple landing pages
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  whatsapp TEXT,
  domain TEXT NOT NULL,
  project TEXT NOT NULL,
  source TEXT NOT NULL, -- 'popup', 'exit-intent', 'contact-form', etc.
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (since this is lead capture)
CREATE POLICY "Allow public lead insertion" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow service role to read all leads
CREATE POLICY "Service role can read all leads" 
ON public.leads 
FOR SELECT 
USING (true);

-- Create index for better performance on domain and project lookups
CREATE INDEX idx_leads_domain_project ON public.leads(domain, project);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();