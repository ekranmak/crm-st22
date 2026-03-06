
CREATE POLICY "Sender can delete messages" ON public.internal_messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Recipient can delete messages" ON public.internal_messages
  FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());
