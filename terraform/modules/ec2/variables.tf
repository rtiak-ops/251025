variable "project_name" {
  description = "Project name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID to place EC2"
  type        = string
}

variable "ec2_sg_id" {
  description = "EC2 Security Group ID"
  type        = string
}

variable "iam_instance_profile_name" {
  description = "IAM instance profile name"
  type        = string
}

variable "key_name" {
  description = "SSH key name"
  type        = string
}

variable "db_password" {
  description = "DB password"
  type        = string
  sensitive   = true
}

variable "rds_endpoint" {
  description = "RDS endpoint"
  type        = string
}

variable "secret_key" {
  description = "App secret key"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "google_api_key" {
  description = "Google API Key"
  type        = string
  sensitive   = true
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
