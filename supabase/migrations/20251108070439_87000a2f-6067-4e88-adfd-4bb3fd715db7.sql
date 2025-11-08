-- Allow CCAs to delete their own demands
CREATE POLICY "CCAs can delete their own demands"
ON public.demands
FOR DELETE
USING (auth.uid() = cca_user_id);

-- Allow agencia to delete any demand
CREATE POLICY "Agencia can delete demands"
ON public.demands
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'agencia'
  )
);

-- Allow CCAs to delete their own conformidades
CREATE POLICY "CCAs can delete their own conformidades"
ON public.conformidades
FOR DELETE
USING (auth.uid() = cca_user_id);

-- Allow agencia to delete any conformidade
CREATE POLICY "Agencia can delete conformidades"
ON public.conformidades
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'agencia'
  )
);