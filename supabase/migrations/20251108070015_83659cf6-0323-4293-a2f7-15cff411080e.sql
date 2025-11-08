-- Allow CCAs to view profiles of agencia users (needed for WhatsApp notifications)
CREATE POLICY "CCAs can view agencia profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'agencia' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'cca'
  )
);

-- Allow agencia to view profiles of CCA users (needed for WhatsApp notifications)
CREATE POLICY "Agencia can view CCA profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'agencia'
  )
);

-- Enable realtime for demands table
ALTER PUBLICATION supabase_realtime ADD TABLE public.demands;

-- Enable realtime for conformidades table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conformidades;