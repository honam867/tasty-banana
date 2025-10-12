-- Create function to update thread's updated_at timestamp
CREATE OR REPLACE FUNCTION update_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE threads
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Create trigger to execute function after message insert
CREATE TRIGGER set_thread_updated_at
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_updated_at();

