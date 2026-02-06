resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db"
  allocated_storage = 20
  storage_type      = "gp3"
  engine            = "postgres"
  engine_version    = "17"
  instance_class    = var.instance_class

  db_name  = "todo_db"
  username = "postgresMaster"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  skip_final_snapshot = true
  publicly_accessible = false
  apply_immediately   = true

  tags = {
    Name = "${var.project_name}-rds"
  }
}
